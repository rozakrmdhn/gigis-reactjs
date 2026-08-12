import type { LoaderFunctionArgs } from "react-router";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const { tipe } = params;

    // We only want to mock 'jalan_porosdesa' as requested by the user,
    // or return it generally to test map rendering.
    if (tipe !== "jalan_porosdesa") {
        // Just return a generic mock or empty for other types
        return Response.json({
            status: "success",
            message: `Mock data untuk ${tipe}`,
            result: { type: "FeatureCollection", features: [] }
        });
    }

    const mockGeoJSON = {
        status: "success",
        message: "Berhasil mengambil mock data segmen jalan poros desa",
        result: {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "mock-1",
                    properties: {
                        nama: "Jl. Poros Desa Bojonegoro 1",
                        kondisi: "Baik",
                        panjang: 1250,
                        kode_desa: "352201"
                    },
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [111.8750, -7.1500],
                            [111.8800, -7.1530],
                            [111.8850, -7.1550],
                            [111.8900, -7.1600]
                        ]
                    }
                },
                {
                    type: "Feature",
                    id: "mock-2",
                    properties: {
                        nama: "Jl. Poros Desa Bojonegoro 2 (Inverted)",
                        kondisi: "Rusak Ringan",
                        panjang: 800,
                        kode_desa: "352202"
                    },
                    geometry: {
                        type: "LineString",
                        // Using [lat, lng] to prove that our fixCoordinates sanitizer works correctly!
                        coordinates: [
                            [-7.1450, 111.8800], 
                            [-7.1480, 111.8900],
                            [-7.1510, 111.9000]
                        ]
                    }
                },
                {
                    type: "Feature",
                    id: "mock-3",
                    properties: {
                        nama: "Jl. Poros Desa Bojonegoro 3 (Stringified)",
                        kondisi: "Rusak Berat",
                        panjang: 450,
                        kode_desa: "352203"
                    },
                    // Stringified geometry to test that the parse logic works
                    geometry: "{\"type\":\"LineString\",\"coordinates\":[[111.8700,-7.1400],[111.8720,-7.1420]]}"
                }
            ]
        }
    };

    return Response.json(mockGeoJSON);
};
