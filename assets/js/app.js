$(document).ready(function() {

  var markers = [];
  var waypts = [];
  var searchResults = [];
  var origin;
  var destination;
  var map;
  var dirDisp = new google.maps.DirectionsRenderer();
  var dirServ = new google.maps.DirectionsService();
  var globalCat;
  var dirurl;
  var showHint = true;

debugger
  function init() {
    $(".panel-weather").hide();
    var startInput = document.getElementById('start-location-input');
    var endInput = document.getElementById('destination-location-input');
    var autocompleteStart = new google.maps.places.Autocomplete(startInput);
    var autocompleteEnd = new google.maps.places.Autocomplete(endInput);

    map = new google.maps.Map(document.getElementById('gmap'), {
      center: new google.maps.LatLng(18.520430, 73.856743),
      zoom: 7
    });
    //40.450886, -74.338184

    dirDisp.setMap(map);
    dirDisp.setPanel(document.getElementById('gdir'));

    var onClickGoHandler = function() {
      clearAll();
      origin = startInput.value;
      destination = endInput.value;
      getDestlnglat(destination);
      calculateAndDisplayRoute();
    };

    document.getElementById('go-btn').addEventListener('click', onClickGoHandler);
    google.maps.event.addListener(map, 'click', function(event) {
      deleteMarkers();
      placeMarker(event.latLng);
    });

    
    $(document).on("click", ".add-route", function() {
      var location = {lat: $(this).data("lat"), lng: $(this).data("lng")};
      var placeId = $(this).data("placeid");
      waypts.push({
        location: location,
        stopover: true
      });
      
      addPlaceToPlaces(placeId);

      //update the waypt: key of the marker to indicate that it is now a waypoint marker
      markers[$(this).data("index")].waypt = true;
      infowindow.close();
      calculateAndDisplayRoute();
    });


    $(document).on("click", ".remove-route", function() {
      var location = {lat: $(this).data("lat"), lng: $(this).data("lng")};  
      var placeId = $(this).data("placeid");
      $("#" + placeId).remove();  
      //delete the waypoint element indicated by the saved waypt-index 
      waypts.splice($(this).data("waypt-index"), 1);

      //if we delete a waypoint somewhere in the middle of the waypnts array, 
      //then the following waypoint indexes need to be updated to reflect their current position in the waypnts array
      $(this).nextAll().data("waypt-index", $(this).data("waypt-index") - 1);

      //update the marker to indicate it is no longer a waypoint and remove it from the map
      markers[$(this).data("index")].waypt = false;
      markers[$(this).data("index")].setMap(null);

      calculateAndDisplayRoute();
    });

    
    $(document).on("click", ".copy-button", function() {
      $("#copy-target").removeClass("hidden")
    });

    var clipboard = new Clipboard('.copy-button');

    clipboard.on('success', function(e) {
      $("#msgModaltitle").html("<span class=\"fa fa-lightbulb-o\" style=\"font-size:24px\"></span> Hint")
      $("#modal-message").text("Your route has been copied to the clipboard!");
      $("#msgModal").modal("show");
    });

    
  } // end of init function
           

  function calculateAndDisplayRoute() {

    dirurl = "https://www.google.com/maps/dir/" + origin;
    waypts.forEach(function(w) {
      dirurl += "/" + w.location.lat + "," + w.location.lng
    })  ;

    dirurl += "/" + destination;

    // call url shortner
    makeShort();

    dirServ.route({
      origin: origin,
      destination: destination,
      waypoints: waypts,
      optimizeWaypoints: true,
      provideRouteAlternatives: true,
      travelMode: 'DRIVING'
        }, function(response, status) {
          if (status === 'OK') {
            dirDisp.setDirections(response);
            // populatePlacesTab(response);
            if (showHint){
              $("#msgModaltitle").html("<span class=\"fa fa-lightbulb-o\" style=\"font-size:24px\"></span> Hint")
              $("#modal-message").text("Click on locations along the route to find restaurants, hotels and weather reports.");
              $("#modal-message").append("  Click on the Take Directions With You button to save your trip. ")
              $("#msgModal").modal("show");
              showHint = false;
            }
          } else {
            $("#msgModaltitle").html("<span class=\"fa fa-warning\" style=\"font-size:24px\"></span> Warning")
            $("#modal-message").text("The route could not be generated.  Please check your starting and ending points.")
            $("#msgModal").modal("show");
          }
      });
    }

    function addPlaceToPlaces(id) {
      var request = {
        placeId: id
      };

      service = new google.maps.places.PlacesService(map);
      service.getDetails(request, callback);

      function callback(place, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          console.log(place);
          pDiv = $('<div>').attr('id', place.place_id).addClass("place-chip");

          if (!(place.photos == null)) {
            pDiv.append($('<img>').attr('src', place.photos[0].getUrl({'maxWidth': 100, 'maxHeight': 100}))
                .addClass('place-pic'))
          } else {
            pDiv.append($('<img>').attr('src', 'assets/images/placesPlaceholder.png')
                .addClass('place-pic'))
          }
          pDiv.append(place.name).addClass('chip-name');

          if (place.rating == null) {
            pDiv.append($('<p>').html('No Rating Available').addClass('chip-rating'));
          } else {
            pDiv.append($('<p>').html("Rating: " + place.rating + " of 5").addClass('chip-rating'));
          }
          
          $('#place_list').append(pDiv);
        }
      }
    }

    function displayPlacesAroundMarker(marker) {
      $('#city_list').empty();
      markers.forEach(function(m) {

        if (m.type === "nearby") {
        
          var geourl = "http://api.geonames.org/findNearbyPlaceNameJSON?radius=50&lat=" + m.position.lat() + "&lng=" + m.position.lng() + "&cities=cities10000&username=tripstop";
      
          $.ajax({ url: geourl, method: "GET" }).done(function(geoResponse) {

            if (geoResponse.geonames.length > 0) {
       
              for (var i = 0; i < geoResponse.geonames.length; i++) {
                var nearbyPlace = $("<div>").addClass("nearby-place-div").text(geoResponse.geonames[i].name.substr(0,19)).attr("data-lat", geoResponse.geonames[i].lat).attr("data-lng", geoResponse.geonames[i].lng);
                nearbyPlace.append('<span class="fa fa-bed fa-fw fa-action" style="font-size:18px"></span>');
                nearbyPlace.append('<span class="fa fa-cutlery fa-fw fa-action" style="font-size:18px"></span>');
                nearbyPlace.append('<span class="fa fa-thermometer-full fa-fw fa-action"  style="font-size:18px"></span>');
                $('#city_list').append(nearbyPlace);
              }  // end of for loop


              $(".fa-action").on("click", function() {           
                var category = 'wiki';
                var classesList = $(this).attr('class').split(" ");
          
                if (classesList.indexOf('fa-cutlery') >= 0) {
                  category = 'restaurant';
                } else if (classesList.indexOf('fa-thermometer-full') >= 0) {
                  category = 'weather';
                } else if (classesList.indexOf('fa-bed') >= 0) {
                  category = 'lodging';
                }
                      
                var lat = $(this).parent().data("lat");
                var lng = $(this).parent().data("lng");
                var city = $(this).parent().text();
          
                getPlacesListFromGoogleAPI(lat, lng, category, city);
          
              });  // end of .fa-action on click event
            } else {
              $("#msgModaltitle").html("<span class=\"fa fa-exclamation-triangle\" style=\"font-size:24px\"></span> Sorry")
              $("#modal-message").text("There are not way points here.  Please try another location")
              $("#msgModal").modal("show");
            }
          });  // end of get geourl ajax
      
        } // end if marker type = nearby
      });  // end of markers.forEach
    } // end of displayPlacesAroundMarker function

    function getPlacesListFromGoogleAPI(lat, lng, category, city) {
        
        globalCat = category;
        if (category == 'weather'){
          getWeather(lat, lng, category, city);
        } else {
          var plc = $("<div class='catNames'>");
          plc.append("<h4>"+ " Find "+  category + "  in " + city + "</h4>");
          var loc = new google.maps.LatLng(lat, lng);
          infowindow = new google.maps.InfoWindow();
          var service = new google.maps.places.PlacesService(map);
          service.nearbySearch({
            location: loc,
            radius: 5000,
            type: [category]
            }, callback);
        }
    }


    function callback(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
          var place = results[i];
          createMarker(place);
        }
      }
    }

    function createMarker(place) {
    var placeLoc = place.geometry.location;
    var icon;

    switch (globalCat) {

        case 'lodging':
            icon = 'assets/images/lodgingicon1.png'
            break;
        case 'restaurant':
            icon = 'assets/images/restaurantIcon1.png'
            break;
        case 'weather':
            icon = 'assets/images/weathericon1.png'
            break;
    }

    var marker = new google.maps.Marker({
      map: map,
      icon: icon,
      waypt: false,
      markeri: markers.length,
      type: "place",
      position: place.geometry.location,
      animation: google.maps.Animation.DROP
    });

    markers.push(marker);

    google.maps.event.addListener(marker, 'click', function() {

      var wayptExists = false;
      var index;
      var location = {lat: this.position.lat(), lng: this.position.lng()};

      for (var i = 0; i < waypts.length; i++) {
        if (waypts[i].location.lat === location.lat && waypts[i].location.lng === location.lng) {
          wayptExists = true;
          index = i;
          break;
        };
      };

      //create infowindow DOM element
      var infodiv = $("<div>").addClass("infowin");
      var name = $("<p>").text(place.name).addClass("place-name");

      var rating;

      if (place.rating == null) {
        rating = $("<p>").text("No Rating Available").addClass("place-rating");
      } else {
        rating = $("<p>").text("Rating: " + place.rating + " of 5").addClass("place-rating");
      }

      var toggleRoute;

      //check to see if this marker, as determined above, is an existing waypoint. 
      //if it is, then store the index of the waypoint in the DOM element so we know which waypoint to remove if the user chooses to do so
      //also, we store the index of the marker itself so we know which marker to delete or not delete (if it's a waypoint) when we refresh the map
      if (wayptExists) {
        toggleRoute = $("<p>").text("Remove from Route").addClass("remove-route")
        .attr("data-lat", this.position.lat()).attr("data-lng", this.position.lng())
        .attr("data-waypt-index", index).attr("data-index", this.markeri)
        .attr("data-placeid", place.place_id);
      } else {
        toggleRoute = $("<p>").text("Add to Route").addClass("add-route")
        .attr("data-lat", this.position.lat()).attr("data-lng", this.position.lng())
        .attr("data-index", this.markeri).attr("data-placeid", place.place_id);
      }

      $("a[href='#places']").click();

      infodiv.append(name).append(rating).append(toggleRoute);

      infowindow.setContent(infodiv.html());
      infowindow.open(map, this);
    });
  }  // end of createMarker

 
  function getDestlnglat(dest){

    // var deststr = dest.replace(/ /gi, "+");
    var deststr = dest

    var settings = {
      "url": "https://maps.googleapis.com/maps/api/geocode/json?address=" + deststr + "&components=locality&key=AIzaSyAltJoOcvLw1SxD-iisimT73aZMELEZ2W0",
      "method": "GET",
    }

    $.ajax(settings).done(function (response) {
           
      if (response.status === 'OK') {
        var destlat = response.results[0].geometry.location.lat;
        var destlng = response.results[0].geometry.location.lng;
        getWeather(destlat, destlng, "destination", dest)
      } 
    });  // end of AJAX to get dest lng and lat 
  }

  function getWeather(lat, lng, category,city) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "https://api.darksky.net/forecast/21641b7b2b96f7eede5a22906c35deb8/" + lat + "," + lng + "?exclude=flags%2Cminutely%2Chourly",
      "method": "GET",
      "dataType": 'jsonp'
    }

    $.ajax(settings).done(function (response) {

      if (response == "Not Found") {
        $("#msgModaltitle").html("<span class=\"fa fa-exclamation-triangle\" style=\"font-size:24px\"></span> Oops")
        $("#modal-message").text("Sorry, weather data is not available right now.");
        $("#msgModal").modal("show");      
      } else {
        if (category == "destination") {
          for (i=0; i<response.daily.data.length; i++) {
            weatherdate =  weatherdate = moment().add(i, "d").format("MM/DD");
            hightemp = response.daily.data[i].temperatureMax;
            lowtemp = response.daily.data[i].temperatureMin;
            weatherforecast = response.daily.data[i].summary;
            $(".table-weather > tbody").append("<tr><td>" + weatherdate + "</td><td>" + hightemp + "</td><td>" + lowtemp + "</td><td>" + weatherforecast + "</td></tr>");
          }
          $("#weather-title").text(" Weather Forecast for " + city)
          $(".panel-weather").show()
        } else {
          $(".table-weather-modal > tbody").text(""); // empty table from previous request
          for (i=0; i<response.daily.data.length; i++) {
            weatherdate =  weatherdate = moment().add(i, "d").format("MM/DD");
            hightemp = response.daily.data[i].temperatureMax;
            lowtemp = response.daily.data[i].temperatureMin;
            weatherforecast = response.daily.data[i].summary;
            $(".table-weather-modal > tbody").append("<tr><td>" + weatherdate + "</td><td>" + hightemp + "</td><td>" + lowtemp + "</td><td>" + weatherforecast + "</td></tr>");
          }
          $("#weatherModalTitle").text(" Weather Forecast for " + city)
          $("#weatherModal").modal("show");// put weather in a modal box

        }
      }
    });   // end of AJAX call to get weather
  }  // end of getWeather


  function placeMarker(location) {
    var marker = new google.maps.Marker({
      position: location,
      map: map,
      type: "nearby",
      animation: google.maps.Animation.DROP
    });
    markers.push(marker);

    // calculateAndDisplayRoute(); Do not refresh map, preserve zoom level an location
    if (markers.length > 0) {
      displayPlacesAroundMarker(markers);
      $("a[href='#cities']").click();
    }
  }  // end of placeMarker function

  // Sets the map on all markers in the array.
  function setMapOnAll(map) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(map);
    }
  } // end of setMapOnAll function

  // Removes the markers from the map, but keeps them in the array.
  function clearMarkers() {
    setMapOnAll(null);
  }

  // Shows any markers currently in the array.
  function showMarkers() {
    setMapOnAll(map);
  }


  // Deletes all markers in the array by removing references to them.
  function deleteMarkers() {
    //make a copy of the current markers so that after we remove all of them, we can add back the waypoint markers
    var markersHold = markers;
    clearMarkers();
    markers = [];

    //if a marker is a waypoint, leave it on the map so the user has a way to remove from the route
    for (var i = 0; i < markersHold.length; i++) {
      if (markersHold[i].waypt) {
        //reset the index hold area of the marker since only waypoint markers are kept
        markersHold[i].markeri = markers.length
        markers.push(markersHold[i])
      }
    }
    showMarkers();
  }   // end of deleteMarkers function


  function makeShort() {

    var xhr = new XMLHttpRequest();
    var xhrdata;
    xhr.open("GET", "https://api-ssl.bitly.com/v3/shorten?access_token=6f2e76e0fdc2ee6a57cfe862e16e1c19909c4efd&longUrl=" + encodeURI(dirurl));
    xhr.onreadystatechange = function() { 
      if(xhr.readyState == 4) { 
        if(xhr.status==200) {
          xhrdata = JSON.parse(xhr.responseText)
          $("#copy-target").text(xhrdata.data.url)
        }
      } 
    }
    xhr.send();
  }  // end of makeShort funtion
  
   
  function clearAll(){
      
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    markers = [];
    waypts = [];
    searchResults = [];
    $(".table-weather > tbody").text("");
    $(".panel-weather").hide();
    $("#city_list").empty();
    $("#place_list").empty();
  }  // end of clearAll function

  google.maps.event.addDomListener(window, 'load', init);

}); // end document ready