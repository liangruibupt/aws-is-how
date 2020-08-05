SELECT aircraft, SUM(departures) AS trips FROM flights
JOIN aircraft using (aircraft_code)
GROUP BY aircraft ORDER BY trips DESC LIMIT 10;