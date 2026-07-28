// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "LocalWeather",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .executable(name: "LocalWeather", targets: ["LocalWeather"]),
    ],
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "LocalWeather",
            dependencies: [
                .product(name: "Alamofire", package: "Alamofire"),
            ],
            path: "Sources"
        ),
    ]
)