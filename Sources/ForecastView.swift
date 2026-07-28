import SwiftUI

struct ForecastView: View {
    let forecastData: [ForecastData]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Daily Forecast")
                .font(.title)
                .bold()

            Divider()

            List(forecastData, id: \.id) { forecast in
                HStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(forecast.date.formatted(date: .abbreviated, time: .omitted))
                            .font(.headline)

                        HStack(spacing: 10) {
                            Image(systemName: "thermometer.max")
                                .font(.system(size: 15))

                            Text("Max: \(\(forecast.maxTemperature, specifier: "%.1f")°C)")
                                .font(.subheadline)
                        }

                        HStack(spacing: 10) {
                            Image(systemName: "thermometer.min")
                                .font(.system(size: 15))

                            Text("Min: \(\(forecast.minTemperature, specifier: "%.1f")°C)")
                                .font(.subheadline)
                        }

                        HStack(spacing: 10) {
                            Image(systemName: "cloud.rain")
                                .font(.system(size: 15))

                            Text("Rain: \(\(forecast.rainSum, specifier: "%.1f") mm)")
                                .font(.subheadline)
                        }
                    }
                }
            }
        }
    }
}

struct ForecastView_Previews: PreviewProvider {
    static var previews: some View {
        let forecastData = [
            ForecastData(date: Date(), maxTemperature: 25.0, minTemperature: 18.0, rainSum: 0.0),
            ForecastData(date: Date().addingTimeInterval(86400), maxTemperature: 27.0, minTemperature: 20.0, rainSum: 2.5),
        ]

        return ForecastView(forecastData: forecastData)
    }
}