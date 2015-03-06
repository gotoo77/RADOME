 // Basic Map
/*
$(document).ready(function(){
 var map = new GMaps({
    el: '#basic_map',
    lat: 51.5073346,
    lng: -0.1276831,
    zoom: 12,
    zoomControl : true,
    zoomControlOpt: {
        style : 'SMALL',
        position: 'TOP_LEFT'
    },
    panControl : false,
  });
});

*/

// Mouse Events on Maps
/*
$(document).ready(function(){
 var map = new GMaps({
    el: '#mouse_event_map',
    lat: 51.5073346,
    lng: -0.1276831,
    zoom: 12,
    zoomControl : true,
    zoomControlOpt: {
        style : 'SMALL',
        position: 'TOP_LEFT'
    },
    panControl : false,
    click: function(e){
      alert('Click event');
    },
    dragend: function(e){
      alert('Drag Event');
    }
  });
});

*/

 // Geolocation
/*
 var map;
$(document).ready(function(){
  var map = new GMaps({
    el: '#geolocation_map',
    lat: 51.5073346,
  lng: -0.1276831,
  });

  GMaps.geolocate({
    success: function(position){
      map.setCenter(position.coords.latitude, position.coords.longitude);

      map.addMarker({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        title: 'You are here.',
        infoWindow: {
          content: '<p>You are here!</p>'
        }
      });
    },
    error: function(error){
      alert('Geolocation failed: '+error.message);
    },
    not_supported: function(){
      alert("Your browser does not support geolocation");
    }
  });
  $("#geolocation_map").css("width", 400).css("height", 400);
});
*/

 // Directions to London
/*
var map;
$(document).ready(function(){
  var map = new GMaps({
    el: '#directions_map',
    lat: 51.5073346,
    lng: -0.1276831,
    zoom:8
  });

  GMaps.geolocate({
    success: function(position){
      map.setCenter(position.coords.latitude, position.coords.longitude);
       map.drawRoute({
        origin: [position.coords.latitude, position.coords.longitude],
        destination: [51.5073346, -0.1276831],
        travelMode: 'driving',
        strokeColor: '#000',
        strokeOpacity: 0.6,
        strokeWeight: 6
      });
    },
    error: function(error){
      alert('Geolocation failed: '+error.message);
    },
    not_supported: function(){
      alert("Your browser does not support geolocation");
    }
  });
  
  $(directions_map).css("width", 400).css("height", 400);
});
*/

 //Static Maps
/*
$(document).ready(function(){
  var url = GMaps.staticMapURL({
    size: [610, 350],
    lat: -33.858290691930996,
    lng: 151.21517658233643
  });
  $('<img/>').attr('src', url).appendTo('#static_map');
});*/

//Map Pointers
var marker1 = {
      lat: 51.503324,
      lng: -0.119543,
      title: 'London Eye',
      infoWindow: {
        content: '<p>The London Eye is a giant Ferris wheel situated on the banks of the River Thames in London, England. The entire structure is 135 metres (443 ft) tall and the wheel has a diameter of 120 metres (394 ft).</p>' 
		}
    };
var marker2 = {
      lat: 51.5007396,
      lng: -0.1245299,
      title: 'Big Ben',
      infoWindow: {
        content: '<p>Big Ben is the nickname for the great bell of the clock at the north end of the Palace of Westminster in London, and often extended to refer to the clock and the clock tower, officially named Elizabeth Tower.</p>'
		}
	};
var marker3 = {
      lat: 51.518856,
      lng: -0.1263371,
      title: 'British Museum',
      infoWindow: {
        content: '<p>The British Museum is a museum in London dedicated to human history and culture.</p>'
      }
    };
var marker4 = {
      lat: 51.5085822,
      lng: -0.1283169,
      title: 'National Gallery',
      infoWindow: {
        content: '<p>The National Gallery is an art museum on Trafalgar Square, London. Founded in 1824, it houses a collection of over 2,300 paintings dating from the mid-13th century to 1900.</p>'
      }
    };
var marker5 = {
      lat: 51.5228316,
      lng: -0.1553503,
      title: 'Madame Tussauds',
      infoWindow: {
        content: '<p>Madame Tussauds is a wax museum in London with branches in a number of major cities.</p>'
      }
    };
var marker6 = {
      lat: 51.5089465,
      lng: -0.0764269,
      title: 'Tower Of London',
      infoWindow: {
        content: '<p>Her Majesty\'s Royal Palace and Fortress, more commonly known as the Tower of London, is a historic castle on the north bank of the River Thames in central London, England, United Kingdom.</p>'
      }
    };
	
var marker_MATIS = {
  lat: 48.885229,
  lng: 2.247772,
  color: 'blue',
  title: 'MATIS Technologies',
  infoWindow: {
	content: '<p>MATIS Technologies <br>Tour Norma,<br> La Défense <br>20 Rue Jean Jaurès <br>92800 Puteaux.</p>'
  }
};

$(document).ready(function(){
	try {
	  map = new GMaps({
		el: '#pointers_map',
		lat: 48.880670,
		lng: 2.188461,
		zoom: 2,
		zoomControl : true,
		zoomControlOpt: {
			style : 'SMALL',
			position: 'TOP_LEFT'
		},
		panControl : true,
		
	  });
	}
	catch(exception){
	}
  
	// Adding the different markers on the map object
	/*
	map.addMarker(marker1);
	map.addMarker(marker2);
	map.addMarker(marker3);
	map.addMarker(marker4);
	map.addMarker(marker5);
	map.addMarker(marker6);
	*/
	map.addMarker(marker_MATIS);
	
	// Adding a context Menu
	map.setContextMenu({
	  control: 'map',
	  options: [{
		title: 'Add marker',
		name: 'add_marker',
		action: function(e) {
		  this.addMarker({
			lat: e.latLng.lat(),
			lng: e.latLng.lng(),
			title: 'New marker'
		  });
		}
	  }, {
		title: 'Center here',
		name: 'center_here',
		action: function(e) {
		  this.setCenter(e.latLng.lat(), e.latLng.lng());
		}
	  }]
	});


});