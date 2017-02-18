var L = require('leaflet');
var DragHandler = require('../../index');
var togpx = require('togpx');
var polyUtil = require('polyline-encoded');

var svggeoj = require("svg-to-geojson");
var $ = require("jquery");

L.Icon.Default.imagePath = "http://cdn.leafletjs.com/leaflet-0.7/images";

////////////////////////////////////////////////////////////////////////////////
var map = global.map = new L.Map('map', {
  // crs: L.CRS.EPSG4326 // that was tested as well
}).setView([58.3683942, 26.6840315], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; ' +
    '<a href="http://osm.org/copyright">OSM</a> contributors'
}).addTo(map);

////////////////////////////////////////////////////////////////////////////////
function interpolateArr(array, insert) {
  var res = [];
  array.forEach(function(p, i, arr) {
    res.push(p.concat());

    if (i < arr.length - 1) {
      var diff = [arr[i + 1][0] - p[0], arr[i + 1][1] - p[1]];
      for (var i = 1; i < insert; i++) {
        res.push([p[0] + (diff[0] * i) / insert, p[1] + (diff[1] * i) / insert]);
      }
    }
  });

  return res;
}

////////////////////////////////////////////////////////////////////////////////
var polygon = global.polygon = new L.Polygon(
  L.GeoJSON.coordsToLatLngs(

    // ~ 13 000 points
    //interpolateArr([
      [
        [26.6840315, 58.3683942,      ],
        [26.6883230, 58.3635099,      ],
        [26.6942453, 58.3617315,      ],
        [26.7010689, 58.3615289,      ],
        [26.7075920, 58.3623168,      ],
        [26.7093945, 58.3640051,      ],
        [26.7095232, 58.3656708,      ],
        [26.7079353, 58.3681017,      ],
        [26.7031288, 58.3699922,      ],
        [26.6974211, 58.3718827,      ],
        [26.6917133, 58.3718827,      ],
        [26.6862202, 58.3705999,      ],
        [26.6840315, 58.3683942,      ]
    //], 100)
      ]
  ), {
    color: '#f00',
    interactive: true,
    draggable: true,
    transform: true
  }).addTo(map);
//polygon.transform.enable();

var routedPoly = null;

function onTransform(params) {

    var gpx = togpx(params.layer.toGeoJSON());

    const options = {
        method: "POST",
        headers: new Headers({'content-type': 'application/gpx+xml'}),
        body: gpx
    };

    fetch("http://172.19.17.155:8989/match?vehicle=foot&type=json&max_visited_nodes=1000000", options)
    .then(function(response) {
        console.log("in first andThen");
        return response.json();
    }).then(function(json) {

        if (routedPoly != null) {
            map.removeLayer(routedPoly);
        }

        console.log("response is:");
        console.log(json);
        var polyline = L.Polyline.fromEncoded(json.paths[0].points);
        console.log(polyline);

        polyline.addTo(map);
        routedPoly = polyline;
    }).catch(function(error) {
        console.log('There has been a problem with your fetch operation: ' + error.message);
    });

    // $.ajax({
    //     contentType: 'application/gpx+xml',
    //     data: gpx,
    //     success: function(data){
    //         console.log("device control succeeded");
    //     },
    //     error: function(){
    //         console.log("Device control failed");
    //     },
    //     type: 'GET',
    //     url: ''
    // });
}

polygon.on('transformed', onTransform);

var layers = [polygon];

function update() {
  L.Util.requestAnimFrame(function() {
    // var dragging = document.querySelector('#dragging').checked;
    // var scaling = document.querySelector('#scaling').checked;
    // var rotation = document.querySelector('#rotation').checked;

      var dragging = true;
      var scaling = true;
      var rotation = true;

      layers.forEach(function(layer) {

      if (layer.dragging) {
        layer.dragging[dragging ? 'enable': 'disable']();
      } else {
        layer.eachLayer(function(sublayer) {
          sublayer.dragging[dragging ? 'enable': 'disable']();
        });
      }


      layer.transform.setOptions({
        scaling: scaling,
        rotation: rotation
      }).enable();
    });
  });
}

[].slice.call(document.querySelectorAll('input[type=checkbox]'))
.forEach(function(checkbox) {
  L.DomEvent.on(checkbox, 'change', update);
});

update();

function shapeSelected(shape) {
    var selected = shape.target.selectedOptions[0].value;

    const options = {
        method: "GET",
        headers: new Headers({'content-type': 'image/svg+xml'}),
    };

    fetch(selected, options)
        .then(function(response) {
            console.log("in first andThen");
            return response.text();
        })
        .then(function(text) {
            console.log($(text)[0]);

            var b = map.getBounds();

            var geojson = svggeoj.svgtogeojson.svgToGeoJson(
                [[b.getNorth(), b.getEast()], [b.getSouth(), b.getWest()]],
                $(text)[0]
            );

            console.log([[b.getNorth(), b.getEast()], [b.getSouth(), b.getWest()]]);

            console.log(geojson);

            console.log();

            //map.removeLayer(polygon);

            var p = new L.Polygon(
                L.GeoJSON.coordsToLatLngs(
                    geojson.features[0].geometry.coordinates[0]
                ),{
                     color: '#f00',
                     interactive: true,
                     draggable: true,
                     transform: true
                }).addTo(map);
            p.transform.enable();
            p.on('transformed', onTransform);

            polygon.transform.disable();
            polygon.removeFrom(map);

            polygon = p;

            /*var poly = L.GeoJSON(geojson.features[0], {
                interactive: true,
                draggable: true,
                transform: true
            }).addTo(map);*/

            //polygon.clearLayers();
            //polygon.addData(geojson.features[0]);

            // var myLayer = L.geoJSON([], {
            //     color: '#f00',
            //     interactive: true,
            //     draggable: true,
            //     transform: true
            // }).addTo(map);
            // myLayer.addData(geojson.features[0]);

            //L.GeoJSON(geojson);

            //console.log(poly);
        })
        .catch(function(error) {
            console.log('There has been a problem with your fetch operation: ' + error.message);
        });

}

document.querySelector('#shape').addEventListener("change", shapeSelected);
