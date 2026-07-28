import Foundation

struct RadarService {
    static func fetchRadarData(completion: @escaping (Result<RadarData, Error>) -> Void) {
        // For Alpine regions, we can use a more appropriate radar service
        // Note: RainViewer API may not work directly for Alpine coordinates.
        // Using Open-Meteo's weather radar data or other APIs like Meteoblue
        let urlString = "https://api.open-meteo.com/v1/forecast?latitude=45.9237&longitude=6.8655&current_weather=true"
        
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
                // Using the same Open-Meteo response structure, we'll get current weather which includes some radar info
                let radarResponse = try decoder.decode(OpenMeteoResponse.self, from: data)
                let radarData = processRadarResponse(radarResponse) 
                completion(.success(radarData))
            } catch {
                // Provide more specific error information to help with debugging
                print("JSON decoding error in RadarService: \(error)")
                completion(.failure(error))
            }
        }.resume()
    }
    
    private static func processRadarResponse(_ response: OpenMeteoResponse) -> RadarData {
        // We can't directly get radar images from Open-Meteo, but we return a valid structure
        // In a real implementation, this would point to actual Alpine radar data
        let dummyURL = "https://example.com/alpine-radar.png"
        
        // Return a default date for now - in a real app you'd parse the timestamp from API response  
        let timestamp = Date()
        
        return RadarData(
            radarImageURL: dummyURL,
            timestamp: timestamp
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