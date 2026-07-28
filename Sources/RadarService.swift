import Foundation

struct RadarService {
    static func fetchRadarData(completion: @escaping (Result<RadarData, Error>) -> Void) {
        // Example URL for RainViewer or Meteoblue radar API
        let urlString = "https://api.rainviewer.com/radar?latitude=47.3667&longitude=9.5"

        guard let url = URL(string: urlString) else {
            completion(.failure(RadarError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(RadarError.invalidResponse))
                return
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                completion(.failure(RadarError.httpError(statusCode: httpResponse.statusCode)))
                return
            }

            guard let data = data else {
                completion(.failure(RadarError.noData))
                return
            }

            do {
                let decoder = JSONDecoder()
                let radarResponse = try decoder.decode(RainViewerResponse.self, from: data)
                let radarData = processRadarResponse(radarResponse)
                completion(.success(radarData))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private static func processRadarResponse(_ response: RainViewerResponse) -> RadarData {
        // Process radar data and return a RadarData object
        return RadarData(
            radarImageURL: response.radarImageURL,
            timestamp: response.timestamp
        )
    }
}

// MARK: - RainViewer API Response Models
struct RainViewerResponse: Codable {
    let radarImageURL: String
    let timestamp: Date
}

// MARK: - Radar Data Model
struct RadarData: Identifiable, Codable {
    let id = UUID()
    let radarImageURL: String
    let timestamp: Date
}

// MARK: - Custom Errors
enum RadarError: Error {
    case invalidURL
    case invalidResponse
    case noData
    case httpError(statusCode: Int)
}

extension RadarError: LocalizedError {
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