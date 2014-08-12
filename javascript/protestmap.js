var zoom_multiplier = 1;

function initialize() {
	// Useful variables
	var dateformat = d3.time.format("%e %B, %Y");
	var max_date = 0;
	var min_date = new Date();
	var brush = d3.svg.brush();

	//Get initial variables from our location, else use default values
	var settings = {};
	settings.ne_lat = -16;
	settings.ne_lng = 42;
	settings.sw_lat = -38;
	settings.sw_lng = 7;
	settings.zoom = 5;
	settings.center_lat = -29;
	settings.center_lng = 24;
	settings.brush_start = false;
	settings.brush_end = false;
	settings.embed = false;

	$.each(window.location.hash.replace("#", "").split("&"), function(i, d) {
		var parts = d.split("=");
		settings[parts[0]] = parts[1];
	});;

	//Check for embedding
	if (settings.embed) {
		$("body").addClass("embedded");
	}

	//Create our map
	var map = L.map("map", { minZoom: 5, zoom: settings.zoom })
		.setView([settings.center_lat, settings.center_lng], settings.zoom);
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		// attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
	})
	.addTo(map);

	//Don't scroll away from South Africa
	map.setMaxBounds([
		[-16, 42],
    	[-38, 7]
    ]);

	//Do some important map business
    map._initPathRoot();

	//Make sure our dots resize on zoom
	map.on("zoomend", function(e) {
		g.selectAll(".shown")
		.attr('r', map._zoom);
	});

	//Every time our view changes, update the URL
	map.on("moveend", function(e) {
		update_url();
	});
	
	// Attach our map to our page
	var svg = d3.select("#map").select("svg");

	// Set up our brush (the thing that lets us choose the date range)
	// setup_brush();
	var mapwidth = $("#map").width();
	

	$(window).on("resize", function() {
		mapwidth = $("#map").width();
		d3.select("#scrubber")
			.attr("width", mapwidth);
		draw_graph();

	});
	var g = svg.append("g");
	
	var brushsvg = d3.select("#scrubber")
		.append("svg")
		.attr("width", mapwidth)
		.attr("height", 70)
	;

	// console.log(1);
	
	function setup_brush() {
		var date_points = 200;
		var mapwidth = $("#map").width();
		// console.log(max_date, min_date);
		var date_scale = d3.time.scale().domain([max_date, min_date]).range([date_points, 0]);
		var scrubber_scale = d3.time.scale().domain([min_date, max_date]).range([0, mapwidth]);
		brush.x(scrubber_scale)
			.on("brush", brushed);
		back_month = new Date(max_date);
		back_month = back_month.setMonth(back_month.getMonth() - 3);
		brushed();
		draw_graph();
		var gBrush = brushsvg.append("g")
			.classed("brush-overlay", true)
			.attr("class", "brush")
			.call(brush);
		gBrush.selectAll("rect")
			.attr("height", 70);
	}

	function update_url() {
		var zoom = map._zoom;
		var bounds = map.getBounds();
		var center = map.getCenter();
		window.location.hash = "#zoom=" + zoom + "&ne_lat=" + bounds._northEast.lat + "&ne_lng=" +  bounds._northEast.lng + "&sw_lat=" + bounds._southWest.lat + "&sw_lng=" +  bounds._southWest.lng + "&type_id=" + $("#protest_types option:selected").val() + "&brush_start=" + brush.extent()[0] + "&brush_end=" + brush.extent()[1] + "&center_lat=" + center.lat + "&center_lng=" + center.lng;
		$("#embed_code").val("<iframe src='" + window.location + "&embed=1' width='600' height='800'></iframe>");
	}

	function change(dots) {
		dots.attr("cx",function(d) { return map.latLngToLayerPoint(d.LatLng).x});
		dots.attr("cy",function(d) { return map.latLngToLayerPoint(d.LatLng).y});
	}

	function test_dot(d) {
		brush_show = (d.date < brush.extent()[1] && d.date > brush.extent()[0]);
		type_id = $("#protest_types option:selected").val();
		if (type_id == 0) {
			filter_show = true;
		} else {
			if (d.type_id == type_id) {
				filter_show = true;
			} else {
				filter_show = false;
			}
		}
		return (brush_show && filter_show);
	}

	function update_scrubber_days() {
		
		day_count = {};
		var max_day_count = 0;
		var day_count_data = [];
		type_id = $("#protest_types option:selected").val();
		g.selectAll(".protest-dot")
			.each(function(d) {
				if (type_id == 0) {
					fitler_show = true;
				} else if (d.type_id == type_id) {
					filter_show = true;
				} else {
					filter_show = false;
				}
				if (filter_show) {
					(day_count[d.date]) ? day_count[d.date] = day_count[d.date] + 1 : day_count[d.date] = 1;
					if (max_day_count < day_count[d.date]) max_day_count = day_count[d.date];
				}
			});
		
		for(dix in day_count) {
			day_count_data.push({date: dix, val: day_count[dix]});
		}
		var x = d3.time.scale()
			.domain([min_date, max_date])
			.range([20, brushsvg.attr("width") - 20])
		;
		var y = d3.scale.linear()
			.domain([0, max_day_count])
			.range([brushsvg.attr("height"), 18]);

		brushsvg.selectAll(".bar")
			.remove();
		var bar = brushsvg.selectAll(".bar")
			.data(day_count_data)
			.enter().append("g")
			.attr("class", "bar")
			.attr("transform", function(d) { return "translate(" + x(new Date(d.date)) + "," + y(d.val) + ")"; });
		bar.append("rect")
			.attr("x", 1)
			.attr("width", 2)
			.attr("transform", "translate(0, -0)")
			.attr("height", 90);
	}

	function update() {
		g.selectAll(".protest-dot")
			.classed("hidden", function(d) {
				return (!test_dot(d));
			})
			.classed("shown", function(d) {
				return (test_dot(d));
			})
		;
		g.selectAll(".shown")
			// .classed("showing", false)
			// .classed("shown", true)
			.attr('r', (4 * map._zoom))
			.transition()
			.duration(500)
			.ease("bounce")
			.attr('r', map._zoom)
		;

		update_url();
	}

	function change_type_id() {
		update();
		update_scrubber_days();
	}


	function brushed() {
		var montharray=new Array("January","February","March","April","May","June","July","August","September","October","November","December");
		d3.select("#visible_date")
			.text(dateformat(brush.extent()[0]) + " - " + dateformat(brush.extent()[1]));
		update();
	}
	var max_date = new Date(0);
	var min_date = new Date();
	var day_count = {};

	function draw_graph() {

		var margin = {top: 0, right: 30, bottom: 0, left: 30};
		
		height = brushsvg.attr("height");
		width = brushsvg.attr("width");
		

		g.selectAll(".protest-dot")
			.each(function(d) {
				var start_date = new Date(d.Start_Date);
				if (start_date > max_date) {
					max_date = start_date;
				}
				if (start_date < min_date) {
					min_date = start_date;
				}
				d.LatLng = new L.LatLng(d.Latitude, d.Longitude);
				d.date = start_date;
		});

		var tmp = new Date(max_date);
		settings.brush_start = settings.brush_start || tmp.setMonth(tmp.getMonth() -1);
		settings.brush_end = settings.brush_end || max_date;

		brush.extent([new Date(settings.brush_start), new Date(settings.brush_end)]);
		brushed();
		

		var x = d3.time.scale()
			.domain([min_date, max_date])
			.range([20, width - 20])
		;

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.ticks(9)
			.outerTickSize(0)
		;

		brushsvg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0,0)")
			.call(xAxis);
		update_scrubber_days();
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
		var width = 500;
		var left = $("#container").offset().left;
		var maxwidth = 800 + left;;
		var minwidth = 0 + left;
		if (e.originalEvent.clientX > (maxwidth - (width / 2))) {
			d3.select("#hover")
				.style("left", (maxwidth - (width / 2) - Math.round(width / 2) ) + "px");
		} else if (e.originalEvent.clientX < (minwidth + (width / 2))) {
			d3.select("#hover")
				.style("left", minwidth + "px");
		} else {
			d3.select("#hover")
				.style("left", (e.originalEvent.clientX - Math.round(width / 2)) + "px");
		}
	});


	// Get the data
	d3.csv("protestdata_1.csv")
		.get(function(error, rows) {
			var day_count = {};
			var protest_types = ["All types"];
			// Itterate through all the data to find some general info
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
				// (day_count[rows[x].date]) ? day_count[rows[x].date] = day_count[rows[x].date] + 1 : day_count[rows[x].date] = 1;
				protest_types[row.type_id] = row.type;
			}

			// Create our protest types dropdown
			d3.select("#protest_types")
				.append("select")
				.on("change", change_type_id)
				.classed("form-control", true)
				.selectAll("option")
				.data(protest_types)
				.enter()
				.append("option")
				.attr("value", function(d, i) {
					return i;
				})
				.attr("selected", function(d, i) {
					if (i == settings.type_id) {
						return "selected";
					}
				})
				.text(
					function(d) {
						return d;
					}
				);
				
			// Create all of our dots
			var dots = g.selectAll("circle")
				.data(rows)
				.enter().append("circle")
				.attr("r", function (d) { return 20 })
				.attr("class", "protest-dot hidden")
				.classed("violent", function(d) {
					return d["violent"] == "1"
				})
				.attr("data-protest-type", function(d) {
					return d["type_id"]
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
					el.select("#type").text(e.type);
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
				.on("click", function(e) { //For mobile
					d3.select("#hover")
						.classed("hidden", false);
				});
			
			// Put our dots in the right place and make sure that they move when our map pans or zooms
			change(dots);
			
			map.on("viewreset", function() {
				change(dots);
			});
			
			setup_brush();
			// console.log(3);
			
		});
}