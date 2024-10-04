const connection = require('../utils/database'); // MySQL connection

exports.getTotalBookingRevenue = async (req, res) => {
  try {
    // Fetch total bookings for the current month
    const totalBookingsQuery = `
      SELECT COUNT(*) AS totalBookings
      FROM \`Bookings\`
      WHERE \`booking_date\` BETWEEN '2024-09-01' AND '2024-09-30';
    `;
    
    connection.query(totalBookingsQuery, (err, totalBookingsResults) => {
      if (err) {
        console.error('Error fetching total bookings:', err);
        return res.status(500).send('Error fetching total bookings');
      }
      
      // Fetch total revenue for the current month
      const totalRevenueQuery = `
        SELECT SUM(amount) AS totalRevenue
        FROM \`Payments\`
        INNER JOIN \`Bookings\` ON \`Payments\`.\`BookingId\` = \`Bookings\`.\`id\`
        WHERE \`Bookings\`.\`booking_date\` BETWEEN '2024-09-01' AND '2024-09-30';
      `;
      
      connection.query(totalRevenueQuery, (err2, totalRevenueResults) => {
        if (err2) {
          console.error('Error fetching total revenue:', err2);
          return res.status(500).send('Error fetching total revenue');
        }

        res.json({
          totalBookings: totalBookingsResults[0].totalBookings,
          totalRevenue: totalRevenueResults[0].totalRevenue,
        });
      });
    });
  } catch (error) {
    console.error('Error fetching totals:', error);
    res.status(500).send('Error fetching totals');
  }
};
