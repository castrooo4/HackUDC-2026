import math


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return radius_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def validate_location_pair(lat: float | None, lon: float | None) -> tuple[float | None, float | None]:
    if (lat is None) != (lon is None):
        raise ValueError("location_lat y location_lon deben enviarse juntos")
    return lat, lon
