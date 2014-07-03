var zoom_multiplier = 1;

function initialize() {
	var map = L.map("map", { minZoom: 5, zoom: 6 })
		.setView([-29, 24], 5);
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);

	map.setMaxBounds([
		[-16, 42],
    	[-38, 7]
    ]);

	map.on("zoomend", function(e) {
		
		g.selectAll(".shown")
		.attr('r', map._zoom);
	});

	var sliderpos = 0;
	var data = [];
	var date_scale = null;
	map._initPathRoot();
	var svg = d3.select("#map").select("svg");
	var scrubsvg = d3.select("#scrubber")
		.append("svg")
		.attr("width", 800)
		.attr("height", 100)
	;
	var g = svg.append("g");
	var date_points = 200;
	var brush = d3.svg.brush();

	var dateformat = d3.time.format("%e %B, %Y");

	function change(dots) {
		dots.attr("cx",function(d) { return map.latLngToLayerPoint(d.LatLng).x});
		dots.attr("cy",function(d) { return map.latLngToLayerPoint(d.LatLng).y});
	}

	function update_scrubber(perc) {
		d3.select("#complete")
			.style("width", perc + "%")
	}


	function brushed() {
		var montharray=new Array("January","February","March","April","May","June","July","August","September","October","November","December");
		d3.select("#visible_date")
			.text(dateformat(brush.extent()[0]) + " - " + dateformat(brush.extent()[1]));
		g.selectAll(".protest-dot")
			.classed("hidden", function(d) {
				if (d.date < brush.extent()[1] && d.date > brush.extent()[0]) {
					return false;
				}
				return true;
			})
			.classed("shown", function(d) {
				if (d.date < brush.extent()[1] && d.date > brush.extent()[0]) {
					return true;
				}
				return false;
			})
			;
		
		g.selectAll(".shown")
			.attr('r', (4 * map._zoom))
			.transition()
			.duration(500)
			.ease("bounce")
			.attr('r', map._zoom);
		;
	}

	function draw_graph(rows, hsvg) {
		var margin = {top: 10, right: 30, bottom: 30, left: 30};
		width = hsvg.attr("width");
		height = hsvg.attr("height");
		var max_date = 0;
		var min_date = new Date();
		var day_count = {};
		var max_day_count = 0;

		for(var x = 0; x < rows.length; x++) {
			var row = rows[x];
			var start_date = new Date(row.Start_Date);
			if (start_date > max_date) {
				max_date = start_date;
			}
			if (start_date < min_date) {
				min_date = start_date;
			}
			rows[x].LatLng = new L.LatLng(rows[x].Latitude, rows[x].Longitude);
			rows[x].date = start_date;
			(day_count[rows[x].date]) ? day_count[rows[x].date] = day_count[rows[x].date] + 1 : day_count[rows[x].date] = 1;
			if (max_day_count < day_count[rows[x].date]) max_day_count = day_count[rows[x].date];
		}

		var day_count_data = [];
		for(dix in day_count) {
			day_count_data.push({date: dix, val: day_count[dix]});
		}

		var x = d3.time.scale()
			.domain([min_date, max_date])
			.range([0, width])
		;

		var y = d3.scale.linear()
			.domain([0, max_day_count])
			.range([height, margin.bottom]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.ticks(8)
		;

		var bar = hsvg.selectAll(".bar")
			.data(day_count_data)
			.enter().append("g")
			.attr("class", "bar")
			.attr("transform", function(d) { return "translate(" + x(new Date(d.date)) + "," + y(d.val) + ")"; });

		bar.append("rect")
			.attr("x", 1)
			.attr("width", 2)
			.attr("transform", "translate(0, -" + margin.bottom + ")")
			.attr("height", function(d) { return height - y(d.val); });

		hsvg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + (height - margin.bottom) + ")")
			.call(xAxis);
	}

	map.on("mousemove", function(e) {
		posY = e.originalEvent.y;
		if(e.target._size.y / e.containerPoint.y > 2) {
			d3.select("#hover")
				.style("top", (posY + 10) + "px")
		} else {
			d3.select("#hover")
				.style("top", (posY - d3.select("#hover")[0][0].clientHeight - 10) + "px")
		}
		
		d3.select("#hover")
			.style("left", (e.originalEvent.clientX -200) + "px");
	});

	d3.csv("protestdata.csv")
		.get(function(error, rows) {
			// console.log(rows);
			var max_date = 0;
			var min_date = new Date();
			var day_count = {};

			for(var x = 0; x < rows.length; x++) {
				var row = rows[x];
				var start_date = new Date(row.Start_Date);
				if (start_date > max_date) {
					max_date = start_date;
				}
				if (start_date < min_date) {
					min_date = start_date;
				}
				rows[x].LatLng = new L.LatLng(rows[x].Latitude, rows[x].Longitude);
				rows[x].date = start_date;
				(day_count[rows[x].date]) ? day_count[rows[x].date] = day_count[rows[x].date] + 1 : day_count[rows[x].date] = 1;
			}

			var dots = g.selectAll("circle")
				.data(rows)
				.enter().append("circle")
				.attr("r", function (d) { return 20 })
				.attr("class", "protest-dot hidden")
				.classed("violent", function(d) {
					return d["Violent_or_non_violent CODE"] == "1.00"
				})
				.on("mouseover", function(e) {
					var el = 
					d3.select("#hover")
						.classed("hidden", false);
					if (e.Start_Date == e.End_Date)
						el.select("#date").text(dateformat(new Date(e.Start_Date)));
					else
						el.select("#date").text(dateformat(new Date(e.Start_Date)) + " to " + dateformat(new Date(e.End_Date)));
					el.select("#Violent_or_violent").text(e.Violent_or_violent);
					el.select("#TownCity_Name").text(e.TownCity_Name);
					el.select("#Suburbareaplacename").text(e.Suburbareaplacename);
					el.select("#Reasonforprotest").text(e.Reasonforprotest);
					el.select("#Municipality_metro").text(e.Municipality_metro);
					el.select("#First_Street").text(e.First_Street);
				})
				.on("mouseout", function(e) {
					d3.select("#hover")
						.classed("hidden", true);
				})
				.on("click", function(e) {
					$("#ward_name").html("");
					$("#accordion").hide();
					$(".in").collapse('hide');
					$(".collapse").find("iframe").attr("src", "");
					d3.json("http://wards.code4sa.org/?database=wards_2011&address=" + e.Latitude + "," + e.Longitude, function(warddata) {
						// console.log(warddata[0]);
						$("#ward_name").html("Ward " + warddata[0].wards_no + "<br />" + warddata[0].municipality + "<br />" + warddata[0].province); 
						var base_url = "http://embed.wazimap.co.za/static/iframe.html?chartType=histogram&chartHeight=200&chartQualifier=&chartTitle=Voters+by+party&initialSort=&statType=scaled-percentage" ;
						var charts = {
							voting: {
								chartDataID: "elections-national_2014-party_distribution",
								chartTitle: "Voters by party"
							},
							water: {
								chartDataID: "service_delivery-water_source_distribution",
								chartTitle: "Population by water source"
							},
							refuse: {
								chartDataID: "service_delivery-refuse_disposal_distribution",
								chartTitle: "Population by refuse disposal"
							},
							toilet: {
								chartDataID: "service_delivery-toilet_facilities_distribution",
								chartTitle: "Population by toilet facilities"
							},
							employment: {
								chartDataID: "economics-employment_status",
								chartTitle: "Population by employment status"
							},
							income: {
								chartDataID: "economics-individual_income_distribution",
								chartTitle: "Employees by monthly income"
							},
							education: {
								chartDataID: "education-educational_attainment_distribution",
								chartTitle: "Population by highest education level"
							},
						}
						for (cid in charts) {
							var url = base_url + "&geoID=ward-" + warddata[0].ward + "&chartDataID=" + charts[cid].chartDataID + "&chartTitle=" + charts[cid].chartTitle;
							d3.select("#wazi-embed-" + cid).attr("data-src", url);
						}
						$("#accordion").show();
						
					});
					// console.log(e);
				})
			;
			
			change(dots);
			
			map.on("viewreset", function() {
				dots.attr("cx",function(d) { return map.latLngToLayerPoint(d.LatLng).x});
				dots.attr("cy",function(d) { return map.latLngToLayerPoint(d.LatLng).y});
			});
			
			date_scale = d3.time.scale().domain([max_date, min_date]).range([date_points, 0]);
			scrubber_scale = d3.time.scale().domain([min_date, max_date]).range([0, 800]);
			y2 = d3.scale.linear().range([100, 0]);
			var areagraph = d3.svg.area()
				.interpolate("monotone")
				.x(scrubber_scale)
				.y0(100)
				.y1(function(d) {  return y2(d.date); });
			brush.x(scrubber_scale)
				.on("brush", brushed);
			back_month = new Date(max_date);
			back_month = back_month.setMonth(back_month.getMonth() - 1);
			brush.extent([new Date(back_month), new Date(max_date)]);
			brushed();
			draw_graph(rows, scrubsvg);

			var gBrush = scrubsvg.append("g")
				.classed("brush-overlay", true)
				.attr("class", "brush")
				.call(brush);

			gBrush.selectAll("rect")
				.attr("height", 70);
		});
}