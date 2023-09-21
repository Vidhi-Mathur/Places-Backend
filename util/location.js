//package to send HttpRequest from frontend applications to backend. Can also be used on a Node server to get request from there
const axios = require("axios");
const HttpError = require("../models/http-error");
//From my.locationiq.com
const API_KEY = "pk.1db49f4e281161b0e937589a29c60141";
 
async function getCoordinates(address) {
//Send a GET request to specified url. encodeURIComponent() encodes a text string as a valid component of a URI.
  const response = await axios.get(
    `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(address)}&format=json`
  );
 
  //Received response is an array[], so get the first element only
  const data = response.data[0];
 
  //No coordinates found
  if (!data || data.status === "ZERO_RESULTS") {
    throw new HttpError("Could not find location for the specified address.", 422);
  }
 
  //Contained as lat, lon but we have lat, long
  const latitude = data.lat;
  const longitude = data.lon;
  const coordinates = {
    lat: latitude,
    long: longitude
  };
 
  return coordinates;
}
 
module.exports = getCoordinates;