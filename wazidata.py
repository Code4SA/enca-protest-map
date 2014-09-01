import csv, sys, requests

# Returns the header fields of a CSV
def headerfields(filename):
	with open(filename, 'rb') as csvfile:
		csvreader = csv.reader(csvfile)
		return csvreader.next()

def points(filename):
	points = []
	with open(filename, 'rb') as csvfile:
		csvreader = csv.DictReader(csvfile)
		for row in csvreader:
			points.append(row)
	return points

def wards(points):
	wards = []
	for point in points:
		lat = point['Latitude']
		lng = point['Longitude']
		addr = lat + "," + lng
		url = "http://wards.code4sa.org/?database=wards_2011&address=" + addr
		print "Fetching ", url
		r = requests.get(url)
		ward_data = r.json()
		point["ward"] = ward_data[0]["ward"]
		print "Ward ", ward_data[0]["ward"]
		wards.append(point)
		# print point
	return wards

def wazi(wards):
	wazi = []
	tables = {"ELECTRICITYFORCOOKING_ELECTRICITYFORHEATING_ELECTR": "Electricity", "SOURCEOFWATER": "Water", "TOILETFACILITIES": "Toilets"}
	for ward in wards:
		for table in tables:
			url = "http://wazimap.co.za/api/1.0/data/show/latest?table_ids=" + table + "&geo_ids=ward-" + ward["ward"]
			print "Fetching ", url
			r = requests.get(url)
			wazi_data = r.json()
			cols = wazi_data["tables"][table]["columns"]
			data = wazi_data["data"]["ward-" + ward["ward"]][table]["estimate"]
			# print data
			new_data = {}
			for key in data:
				if cols[key]["name"] in new_data:
					new_data[cols[key]["name"]] = new_data[cols[key]["name"]] + data[key]	
				else:
					new_data[cols[key]["name"]] = data[key]
			ward[tables[table]] = new_data
		wazi.append(ward)
	return wazi

def reduce_data(wazi, headerfields):
	reduced = []
	for row in wazi:
		newrow = {}
		for col in row:
			if type(row[col]) is dict:
				for key in row[col]:
					newkey = col + "." + key
					newval = row[col][key]
					newrow[newkey] = newval
					headerfields.append(newkey)
			else:
				newrow[col] = row[col]
		reduced.append(newrow)
	return reduced, headerfields

def output_csv(reduced, output_filename, headerfields):
	with open(output_filename, 'wb') as csvfile:
		dictwriter = csv.DictWriter(csvfile, headerfields)
		dictwriter.writeheader()
		dictwriter.writerows(reduced)
	print "Wrote file ", output_filename
	pass

if __name__ == "__main__":
	filename = sys.argv[1]
	output_filename = sys.argv[2]
	headerfields = headerfields(filename)
	headerfields.append("ward")
	points = points(filename)
	wards = wards(points)
	wazi = wazi(wards)
	reduced, headerfields = reduce_data(wazi, headerfields)
	output_csv(reduced, output_filename, headerfields)