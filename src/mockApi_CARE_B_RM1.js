// Synthetic environment readings for CARE-B-RM1

function getCARE_B_RM1_Readings() {
  const readings = [];
  const now = new Date();
  for (let h = 0; h < 24; h++) {
    const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
    readings.push({
      device_id: "CARE-B-RM1",
      timestamp: timestamp.toISOString(),
      temperature_c: +(20 + Math.random() * 5).toFixed(2),
      humidity_percent: +(40 + Math.random() * 20).toFixed(2),
      co_ppm: +(0.5 + Math.random() * 1.5).toFixed(2),
      co2_ppm: +(400 + Math.random() * 200).toFixed(2),
    });
  }
  return readings;
}

function getCARE_B_RM1_ReadingNow() {
  const now = new Date();
  const local = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  return {
    device_id: "CARE-B-RM1",
    timestamp: local.toISOString(),
    temperature_c: +(20 + Math.random() * 5).toFixed(2),
    humidity_percent: +(40 + Math.random() * 20).toFixed(2),
    co_ppm: +(0.5 + Math.random() * 1.5).toFixed(2),
    co2_ppm: +(400 + Math.random() * 200).toFixed(2),
  };
}

module.exports = { getCARE_B_RM1_Readings, getCARE_B_RM1_ReadingNow };