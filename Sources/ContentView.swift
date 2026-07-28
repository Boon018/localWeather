import SwiftUI

struct ContentView: View {
    @State private var currentWeather: WeatherData? = nil
    @State private var radarData: RadarData? = nil
    @State private var forecastData: [ForecastData] = []
    @State private var isLoading = true
    @State private var errorMessage: String? = nil
    
    var body: some View {
        VStack(spacing: 20) {
            if isLoading {
                ProgressView("Loading weather data...")
                    .padding()
            } else if let errorMessage = errorMessage {
                Text("Error: \(errorMessage)")
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding()
            } else if let weather = currentWeather {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Current Weather")
                        .font(.title)
                        .bold()
                    
                    Divider()
                    
                    HStack(spacing: 20) {
                        Image(systemName: "thermometer")
                            .font(.system(size: 30))
                        
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Temperature")
                                .font(.headline)
                            Text("\(weather.temperature, specifier: "%.1f")°C")
                                .font(.title)
                        }
                    }
                    
                    HStack(spacing: 20) {
                        Image(systemName: "humidity")
                            .font(.system(size: 30))
                        
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Humidity")
                                .font(.headline)
                            Text("\(weather.humidity, specifier: "%.1f")%")
                                .font(.title)
                        }
                    }
                    
                    HStack(spacing: 20) {
                        Image(systemName: "wind")
                            .font(.system(size: 30))
                        
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Wind Speed")
                                .font(.headline)
                            Text("\(weather.windSpeed, specifier: "%.1f") m/s")
                                .font(.title)
                        }
                    }
                    
                    HStack(spacing: 20) {
                        Image(systemName: "cloud.rain")
                            .font(.system(size: 30))
                        
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Rain Sum (Past 24h)")
                                .font(.headline)
                            Text("\(weather.rainSum, specifier: "%.1f") mm")
                                .font(.title)
                        }
                    }
                    
                    Divider()
                    
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Radar Data")
                            .font(.title)
                            .bold()
                        
                        if let radar = radarData {
                            AsyncImage(url: URL(string: radar.radarImageURL)) { image in
                                image.resizable()
                                    .scaledToFit()
                                    .frame(height: 200)
                            } placeholder: {
                                ProgressView("Loading radar...")
                                    .frame(height: 200)
                            }
                        } else {
                            Text("No radar data available.")
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Divider()
                    
                    ForecastView(forecastData: forecastData)
                }
                .padding()
            } else {
                Text("No weather data available.")
                    .foregroundColor(.gray)
            }
        }
        .onAppear {
            fetchWeatherData()
            fetchRadarData()
            fetchForecastData()
        }
    }
    
    private func fetchWeatherData() {
        WeatherService.fetchCurrentWeather { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let weather):
                    self.currentWeather = weather
                    self.errorMessage = nil
                case .failure(let error):
                    self.currentWeather = nil
                    self.errorMessage = "Failed to fetch current weather: \(error.localizedDescription)"
                }
                self.isLoading = false
            }
        }
    }
    
    private func fetchRadarData() {
        RadarService.fetchRadarData { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let radar):
                    self.radarData = radar
                case .failure(let error):
                    print("Error fetching radar data: \(error.localizedDescription)")
                    // Continue without radar data - not critical for the app to function
                    self.radarData = nil
                }
            }
        }
    }
    
    private func fetchForecastData() {
        ForecastService.fetchDailyForecast { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let forecasts):
                    self.forecastData = forecasts
                case .failure(let error):
                    print("Error fetching forecast data: \(error.localizedDescription)")
                    // Continue without forecast data - not critical for the app to function
                    self.forecastData = []
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}