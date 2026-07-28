import Foundation

struct ForecastService {
    static func fetchDailyForecast(completion: @escaping (Result<[ForecastData], Error>) -> Void) {
        // Example URL for Open-Meteo API (daily forecast)
        let urlString = "https://api.open-meteo.com/v1/forecast?latitude=47.3667&longitude=9.5&daily=temperature_2m_max,temperature_2m_min,rain_sum"

        guard let url = URL(string: urlString) else {
            completion(.failure(ForecastError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(ForecastError.invalidResponse))
                return
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                completion(.failure(ForecastError.httpError(statusCode: httpResponse.statusCode)))
                return
            }

            guard let data = data else {
                completion(.failure(ForecastError.noData))
                return
            }

            do {
                let decoder = JSONDecoder()
                let forecastResponse = try decoder.decode(OpenMeteoForecastResponse.self, from: data)
                let forecastData = processForecastResponse(forecastResponse)
                completion(.success(forecastData))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private static func processForecastResponse(_ response: OpenMeteoForecastResponse) -> [ForecastData] {
        var forecastList = [ForecastData]()

        for (index, daily) in response.daily.enumerated() {
            let date = Date(timeIntervalSince1970: TimeInterval(daily.time!))
            let forecast = ForecastData(
                date: date,
                maxTemperature: daily.temperature_2m_max,
                minTemperature: daily.temperature_2m_min,
                rainSum: daily.rain_sum
            )
            forecastList.append(forecast)
        }

        return forecastList
    }
}

// MARK: - Open-Meteo API Response Models for Forecast
struct OpenMeteoForecastResponse: Codable {
    let daily: [DailyData]
}

struct DailyData: Codable {
    let time: String?
    let temperature_2m_max: Double
    let temperature_2m_min: Double
    let rain_sum: Double
}

// MARK: - Forecast Data Model
struct ForecastData: Identifiable, Codable {
    let id = UUID()
    let date: Date
    let maxTemperature: Double
    let minTemperature: Double
    let rainSum: Double
}

// MARK: - Custom Errors
enum ForecastError: Error {
    case invalidURL
    case invalidResponse
    case noData
    case httpError(statusCode: Int)
}

extension ForecastError: LocalizedError {
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