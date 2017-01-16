/*
File name: map.js
Purpose: Creating the maps of Redline MBTA
Name:Chan Hiu Ki
Date:3/8/16
*/
	/*Purpose: Creating coordinates to south station*/
	var southLat =  42.352271;
	var southLng = -71.05524200000001;		
	var request = new XMLHttpRequest();
	var south = new google.maps.LatLng(southLat, southLng);

	/*Setting up the map*/
	var myOptions = {
				zoom: 13, // The larger the zoom number, the bigger the zoom
				center: south,
				scrollwheel: false,
    			navigationControl: false,
    			mapTypeControl: false,
    			scaleControl: false,
    			draggable: true,
				mapTypeId: google.maps.MapTypeId.ROADMAPvar,
	};
		
	var map;
	var marker;

	/*To store the distances calculated by haversine*/
	var distances = [];
	
	/*To store information from the parsed json REDLINE api data*/
	var schedules = [];	

	/*Coordinates for creating the station markers*/
	var all_coordinates = [ {"station":"Alewife", "lat":42.395428, "lng":-71.142483},
							{"station":"Davis", "lat":42.39674, "lng": -71.121815},
							{"station":"Porter Square", "lat":42.3884, "lng": -71.1191489999999},
							{"station":"Harvard Square", "lat":42.373362, "lng": -71.118956},
							{"station":"Central Square", "lat":42.365486, "lng": -71.103802},
							{"station":"Kendall/MIT", "lat":42.36249079, "lng": -71.08617653},
							{"station":"Charles/MGH", "lat":42.361166, "lng": -71.070628},
							{"station":"Park Street", "lat":42.35639457, "lng":-71.0624242},
							{"station":"Downtown Crossing", "lat":42.355518, "lng": -71.060225},
							{"station":"South Station", "lat":42.352271, "lng": -71.05524200000001},
							{"station":"Broadway", "lat":42.342622, "lng": -71.056967},
							{"station":"Andrew", "lat":42.330154, "lng": -71.057655},
							{"station":"JFK/UMass", "lat":42.320685, "lng": -71.052391},
							{"station":"North Quincy", "lat":42.275275, "lng": -71.029583},
							{"station":"Wollaston", "lat":42.2665139, "lng": -71.0203369},
							{"station":"Quincy Center", "lat":42.251809, "lng": -71.005409},
							{"station":"Quincy Adams", "lat":42.233391, "lng": -71.007153},
							{"station":"Braintree", "lat": 42.2078543, "lng": -71.0011385},
							{"station":"Savin Hill", "lat": 42.31129, "lng": -71.053331},
							{"station":"Fields Corner", "lat": 42.300093, "lng": -71.06573796000001},
							{"station":"Ashmont", "lat": 42.284652, "lng": -71.06448899999999},
							
							];

	/*Purpose: Initializing the map using Google API*/
	function init()
		{
			map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
			renderMap();

			if (navigator.geolocation) { // the navigator.geolocation object is supported on your browser
			navigator.geolocation.getCurrentPosition(function(position) {
					myLat = position.coords.latitude;
					myLng = position.coords.longitude;
					sendLocation();
					schedule(); /*where the json data is parsed into object schedule []*/
				
					stations(); 
					marker_output = findclosestT();
					my_location(marker_output);
					my_polyline(marker_output);
					polyline();
				});
			}
			else {
				alert("Geolocation is not supported by your web browser.  What a shame!");
			}
		}

		//POST REQUEST
	function sendLocation(){

		request = new XMLHttpRequest();
		request.open("POST", "https://tranquil-plains-45391.herokuapp.com/sendlocation", true);
		request.onreadystatechange = store_geolocation;

		var location = "lat=" + myLat + "&lon=" + myLng; 

		function store_geolocation(){
			if (request.readyState ==4 && request.status ==200) {
				var request = request.responseText;	
				console.log("i'm sending location");
			}
		};
		//sending the content type
		request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		request.send(location);

	}
	
		// Purpose: Initializing south station as center
	function renderMap()
		{
			south = new google.maps.LatLng(southLat, southLng);
			map.panTo(south);

			// creating the icon with own image
			symbol = {
		 	   url: "icon.jpg",
		  	   scaledSize: new google.maps.Size(50, 50), // scaled size
		  	   origin: new google.maps.Point(0,0), // origin
		       anchor: new google.maps.Point(0, 0) // anchor

			};

			// Creating the marker
			marker = new google.maps.Marker({
				position: south,
				title: "South Station",
				icon: symbol
			});

			marker.setMap(map);

		}

	/*Purpose: Parse data from REDLINE API JSON into a structure that stores the data 
				for the Stop name, Destination of train, and the upcoming train schedule*/
	function schedule(){

		/*XMLHttpRequest to retrieve the data from RedLine Json API*/
		var request = new XMLHttpRequest();
		request.open("GET", "https://tranquil-plains-45391.herokuapp.com/redline.json", true);
		request.onreadystatechange = redline_schedule;
		request.send(null);

		function redline_schedule(){
			if (request.readyState==4 && request.status ==200) {
				/*Parsing data into the obj*/
				data = request.responseText;
				obj = JSON.parse(data);

				/*Parsing the data into the object schedule[]*/
				var trips = obj["TripList"]["Trips"];

				for (var i=0;i<trips.length;i++){

					for (var j=0; j<trips[i]["Predictions"].length; j++){
						schedules.push({"Station": trips[i]["Predictions"][j]["Stop"], 
										"Destination": trips[i]["Destination"], 
										"Seconds": trips[i]["Predictions"][j]["Seconds"]});			
					}
				
				}

				convert_to_minutes();
				stations(); /*Calls station() that sets the markers for each statin*/
			}
		} 

	}
	

	// Purpose: Creating markers for separate stations through hardcoding
	function stations() {

		var infowindow = new google.maps.InfoWindow;

		/*Goes through the object in all_coordinates */
		for (var i=0; i<all_coordinates.length; i++) {
				// var current_coordinates  = all_coordinates[i]["station"];
				var contentString;
				var info_container = [];
				current_coordinates = new google.maps.LatLng(all_coordinates[i]["lat"], all_coordinates[i]["lng"]);

				// /*pushes the coordinates into distance [ ] object to calculate closest station*/
				distances.push({"station_name": all_coordinates[i]["station"], 
					"distance": haversine(myLat,myLng, all_coordinates[i]["lat"], all_coordinates[i]["lng"])});
				
				/*Loop that finds the station name within 'all_coordinates' object 
				  once found, an info window should be placed onto the lat/lng location of each station*/
				for (var j=0;j<schedules.length;j++){
					if (all_coordinates[i]["station"] == schedules[j]["Station"]) {				
						info_container.push("<p>" + "Station: " + " " + schedules[j]["Station"] 
						+ " | " + "Going Towards: " + " " + schedules[j]["Destination"] + " |  " 
						+ "Upcoming Trains: " + " " + schedules[j]["Seconds"] + "s" + "</p>");
					}
				} 

				for (var k =0;k<info_container.length; k++){
					contentString += info_container[k];
					contentString += "\n";
				}

				/*Sets the marker for each station*/
				station_marker = new google.maps.Marker({
					position: current_coordinates,
					icon: symbol,
					map: map,
					content: contentString

				}); station_marker.setMap(map);	
	

				/*info window popup*/
				station_marker.addListener('click', function() {
					infowindow.setContent(this.content); //changed content from contentString
					infowindow.open(map, this);
					});
		
				contentString ="";

		} 

	}


	// Purpose: to create polyline that traverses all stations	
	function polyline()
		{
		 	// first poly line, split to braintree	
	 	 	var pathways1 = [
	 	 	{lat: 42.395428, lng: -71.142483},/*alewife*/
	 	 	{lat: 42.39674, lng: -71.121815},/*davis*/
	 	 	{lat: 42.3884, lng:-71.11914899999999}, /*porter*/
	 	 	{lat: 42.373362, lng:  -71.118956},/*havard*/
	 	 	{lat: 42.365486, lng: -71.103802},/*central*/
	 	 	{lat: 42.36249079, lng: -71.070628}, /*Kendell*/
	 	 	{lat:42.361166, lng:-71.070628}, /*charles*/
	 	 	{lat:42.35639457, lng: -71.0624242}, /*park*/
	 	 	{lat:42.355518, lng: -71.060225}, /*downtown*/
	 	 	{lat:42.352271, lng:-71.05524200000001}, /*south*/
	 	 	{lat: 42.342622, lng:-71.056967}, /*broadway*/
	 	 	{lat: 42.330154, lng: -71.057655}, /*andrew*/
	 	 	{lat: 42.320685, lng: -71.052391}, /*jfk*/
	 	 	{lat: 42.275275, lng: -71.029583}, /*northquincy*/
	 	 	{lat: 42.2665139, lng: -71.0203369}, /*wallaston*/
	 	 	{lat: 42.251809, lng: -71.005409}, /*quincyCenter*/
	 	 	{lat:  42.233391, lng: -71.007153}, /*quincyAdams*/
	 	 	{lat: 42.2078543, lng: -71.0011385} /*braintree*/

	 	 	];

		 	var Path1 = new google.maps.Polyline({
		    path: pathways1,
		    strokeColor: '#FF0000',
		    geodesic: true,
		    strokeOpacity: 1.0,
		    strokeWeight: 3
 			});

	 	 	/*second poly line, split to ashmont*/
 			 var pathways2 = [
	 	 	{lat: 42.320685, lng: -71.052391}, /*jfk*/
	 	 	{lat: 42.31129, lng: -71.053331}, /*savin*/
	 	 	{lat: 42.300093, lng: -71.061667}, /*fields*/
	 	 	{lat: 42.29312583, lng:-71.06573796000001}, /*shawmut*/ 
	 	 	{lat: 42.284652, lng: -71.06448899999999}, /*ashmont*/
	 	 	];


	 	 	var Path2 = new google.maps.Polyline({
		    path: pathways2,
		    strokeColor: '#FF0000',
		    geodesic: true,
		    strokeOpacity: 1.0,
		    strokeWeight: 3
 			});

		 	Path1.setMap(map);
		 	Path2.setMap(map);
		}


	/*Purpose: To set up user geolocation*/
	function my_location(marker_output) {

		var infowindow = new google.maps.InfoWindow({
        });

		/*Marks user geo location*/
		my_symbol = {
		 	   url: "my_icon.png",
		  	   scaledSize: new google.maps.Size(50, 50), // scaled size
		  	   origin: new google.maps.Point(0,0), // origin
		       anchor: new google.maps.Point(0, 0) // anchor
			};
		var mylocation = new google.maps.LatLng(myLat, myLng);
			myMarker = new google.maps.Marker({
				position: mylocation,
				title: "MyLocation",
				icon: my_symbol,
				map: map,
				content: contentS
			});

		/*gives information for popup marker for the closest station and the miles for that station*/
        var contentS = '<div id="content">' + 'Closest Train Station:' + '<br>' + marker_output[0] + 
        					'<p>How Far:' + '<br>' + marker_output[1] + "miles" + '</div>';

        /*Popup marker that interacts with user once he/she clicks on marker*/
		myMarker.addListener('click', function() {
			infowindow.setContent(contentS);
			infowindow.open(map, this);
			});
	}

	/*Purpose: To create a poly line connecting own geolocation to the closest station
				marker_output is passed in as an object to retrieve data of closest station*/
	function my_polyline(marker_output){

		for (var i = 0; i < all_coordinates.length; i++){
			if (marker_output[0] == all_coordinates[i]["station"]) {
				var current_lat = all_coordinates[i]["lat"];
				var current_lng = all_coordinates[i]["lng"];
				var my_line = [
					{lat: current_lat, lng: current_lng},
					{lat: myLat, lng: myLng}

					];
			}
		}

		var my_path = new google.maps.Polyline({
	    path: my_line,
	    geodesic: true,
	    strokeColor: '#0000ff',
	    strokeOpacity: 1.0,
	    strokeWeight: 3
		});
	
		my_path.setMap(map);
	}

	/*Purpose: Compare the distance from geo location to the location of the closest
				station*/

	function convert_to_minutes(){
	
		for (var i=0; i<schedules.length; i++){
			var time = schedules[i]["Seconds"];
			var minutes = Math.floor(time / 60);
			var seconds = time - minutes * 60;
			schedules[i]["Seconds"] = minutes + "." + seconds;
		} 

	}				

	function findclosestT() {

		var current_distance = distances[0]["distance"];

		var current_Tstop = distances[0]["station_name"];
		for (var i=0; i<distances.length; i++){
			if (distances[i]["distance"]<current_distance) {
				current_distance = distances[i]["distance"];
				closest_Tstop = distances[i]["station_name"];
			} 
		}

		/*to make the distance to 2 decimal figure*/
		closest_distance_2dec = Math.round(current_distance * 100) / 100
		
		/*closestT[0], closestD[1]*/
		output = [current_Tstop,closest_distance_2dec];
	
			return output;
	}

	/*Purpose: To calculate the closest T station*/
	function haversine(mylat, mylon, station_lat, station_lon) {

		Number.prototype.toRad = function() {
		   return this * Math.PI / 180;
		}

		var lat1 = mylat;
		var lon1 = mylon;
		var lat2 = station_lat;
		var lon2 = station_lon;

		var R = 6371; // km 
		var x1 = lat2-lat1;
		var dLat = x1.toRad();  
		var x2 = lon2-lon1;
		var dLon = x2.toRad();  
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
		                Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
		                Math.sin(dLon/2) * Math.sin(dLon/2);  
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		var d = R * c; 

		d /= 1.60934 //convert to miles
		return d;

	}

		