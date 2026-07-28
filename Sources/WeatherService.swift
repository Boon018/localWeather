import Foundation

struct WeatherService {
    static func fetchCurrentWeather(completion: @escaping (Result<WeatherData, Error>) -> Void) {
        // Example URL for Open-Meteo API (replace with actual coordinates for Alpine region)
        let urlString = "https://api.open-meteo.com/v1/forecast?latitude=47.3667&longitude=9.5&current_weather=true&hourly=temperature_2m,relativehumidity_2m,rain_sum"

        guard let url = URL(string: urlString) else {
            completion(.failure(WeatherError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(WeatherError.invalidResponse))
                return
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                completion(.failure(WeatherError.httpError(statusCode: httpResponse.statusCode)))
                return
            }

            guard let data = data else {
                completion(.failure(WeatherError.noData))
                return
            }

            do {
                let decoder = JSONDecoder()
                let weatherResponse = try decoder.decode(OpenMeteoResponse.self, from: data)
                let weatherData = processWeatherResponse(weatherResponse)
                completion(.success(weatherData))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private static func processWeatherResponse(_ response: OpenMeteoResponse) -> WeatherData {
        let temperature = response.currentWeather.temperature
        let humidity = response.hourly.relativehumidity_2m.first ?? 0
        let windSpeed = response.currentWeather.windspeed
        let rainSum = response.hourly.rain_sum.last ?? 0

        return WeatherData(
            temperature: temperature,
            humidity: humidity,
            windSpeed: windSpeed,
            rainSum: rainSum
        )
    }
}

// MARK: - Open-Meteo API Response Models
struct OpenMeteoResponse: Codable {
    let currentWeather: CurrentWeather
    let hourly: HourlyData
}

struct CurrentWeather: Codable {
    let temperature: Double
    let windspeed: Double
}

struct HourlyData: Codable {
    let relativehumidity_2m: [Double]
    let rain_sum: [Double]
}

// MARK: - Custom Errors
enum WeatherError: Error {
    case invalidURL
    case invalidResponse
    case noData
    case httpError(statusCode: Int)
}

extension WeatherError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .noData:
            return "No data received"
        case .httpError(let statusCode):
            return "HTTP error with status code: \(statusCode)"
        }
    }
}