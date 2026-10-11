'use strict';
const base = process.env.DELTA_WEBSITE_URL?.replace(/\/+$/, '');
const secret = process.env.DELTA_FLIGHT_API_SECRET;

function websiteConfigured() {
  return Boolean(base && /^https:\/\//i.test(base) && secret && secret.length >= 32);
}
async function websiteRequest(path, data) {
  if (!websiteConfigured()) throw new Error('DELTA_WEBSITE_URL and a strong DELTA_FLIGHT_API_SECRET are required');
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.detail || 'Delta website HTTP ' + response.status);
  return value;
}
async function getFlight(flightId) {
  if (!websiteConfigured()) throw new Error('Delta website not configured');
  if (!Number.isSafeInteger(flightId) || flightId < 1) throw new Error('Invalid flight ID');
  const response = await fetch(base + '/internal/flights/' + flightId, {
    headers: { Authorization: 'Bearer ' + secret },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Flight lookup failed');
  return data;
}
function updateFlightStatus(flightId, details) {
  if (!Number.isSafeInteger(flightId) || flightId < 1) throw new Error('Invalid flight ID');
  return websiteRequest('/internal/flights/' + flightId + '/status', details);
}
function hostFlight(flight) { return websiteRequest('/internal/flights/host', flight); }
function skyMiles(action, payload) { return websiteRequest('/internal/skymiles/' + action, payload); }
module.exports = { websiteConfigured, websiteRequest, hostFlight, skyMiles, getFlight, updateFlightStatus };
