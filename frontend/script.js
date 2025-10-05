const yearSlider = document.getElementById("year-slider");
const yearLabel = document.getElementById("year-label");
const generateButton = document.getElementById("generate-button");
const ctx = document.getElementById("myChart").getContext("2d");

let myChart; // Variable to hold the chart instance

// Update the label when the slider moves
yearSlider.addEventListener("input", (event) => {
  yearLabel.textContent = event.target.value;
});

// Fetch data and create the chart when the button is clicked
generateButton.addEventListener("click", async () => {
  const year = yearSlider.value;
  const apiUrl = `http://127.0.0.1:5000/api/timeseries?year=${year}`;

  console.log(`Requesting data from: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`No data found for ${year}`);
    }
    const data = await response.json();

    console.log("Data received:", data);

    // If a chart already exists, destroy it before creating a new one
    if (myChart) {
      myChart.destroy();
    }

    // Create the new chart using Chart.js
    myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.months,
        datasets: [
          {
            label: `Global Average CO for ${year}`,
            data: data.averages,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: "CO Concentration (molecules/cm^2)",
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching or plotting data:", error);
    alert(error.message);
  }
});
