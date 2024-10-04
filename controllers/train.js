const moment = require('moment');
const connection = require('../utils/database');

exports.getStation = (req, res) => {
    try {
        const query = 'SELECT id, name FROM travel_app_db.stations';

        connection.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching station details:", error);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            
            res.status(200).json({ stations: results });
        });
    } catch (error) {
        console.error("Unexpected error fetching station details:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getTrains = async (req, res) => {
    const { stationId, date } = req.body;

    try {
        const dayOfWeek = moment(date).format('dddd');

        // Fetch station name from the stations table using raw SQL query
        connection.query(
            'SELECT name FROM travel_app_db.stations WHERE id = ?',
            [stationId],
            (error, stationResults) => {
                if (error) {
                    console.error("Error fetching station details:", error);
                    return res.status(500).json({ message: 'Database query error' });
                }

                if (stationResults.length === 0) {
                    return res.status(404).json({ message: 'Station not found' });
                }

                const stationName = stationResults[0].name;

      const query = `
          SELECT
              t.name AS trainName,
              t.number AS trainNumber,
              r.arrival_time,
              r.departure_time,
              s1.name AS startStation,
              s2.name AS endStation,
              TIMEDIFF(r.arrival_time , r.departure_time) AS duration,
              GROUP_CONCAT(s.class ORDER BY s.class) AS seatClasses,  
              GROUP_CONCAT(s.available_seats ORDER BY s.class) AS availableSeats,  
              GROUP_CONCAT(s.total_seats ORDER BY s.class) AS totalSeats,  
              GROUP_CONCAT(s.price ORDER BY s.class) AS price
          FROM
              travel_app_db.trains t
          JOIN
              travel_app_db.stations s1 ON t.start_station_id = s1.id
          JOIN
              travel_app_db.stations s2 ON t.end_station_id = s2.id
          JOIN
              travel_app_db.routes r ON r.trainId = t.id
          JOIN
              travel_app_db.seats s ON s.trainId = t.id
          WHERE
              (s1.name = :stationName OR s2.name = :stationName)
              AND FIND_IN_SET(:dayOfWeek, t.days) > 0
          GROUP BY
              t.id, r.arrival_time, r.departure_time, s1.name, s2.name;
      `;

      connection.query(query, [stationName, stationName, dayOfWeek], (err, trainResults) => {
        if (err) {
            console.error("Error fetching trains:", err);
            return res.status(500).json({ message: 'Database query error' });
        }

        if (trainResults.length === 0) {
            return res.status(404).json({ message: 'No trains available for the selected station and date' });
        }

        // Process the seat details for each train
        const processedTrains = trainResults.map(train => {
            const seatClassesArray = train.seatClasses.split(',');
            const availableSeatsArray = train.availableSeats.split(',');
            const totalSeatsArray = train.totalSeats.split(',');
            const priceArray = train.price.split(',');

            const seats = seatClassesArray.map((seatClass, index) => ({
                seatClass: seatClass.trim(),
                availableSeats: parseInt(availableSeatsArray[index], 10),
                totalSeats: parseInt(totalSeatsArray[index], 10),
                price: parseInt(priceArray[index], 10),
            }));

            return {
                ...train,
                seats,
            };
        });

        // Send the response with the processed train data
        res.status(200).json({ trains: processedTrains });
    });
}
);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
  };