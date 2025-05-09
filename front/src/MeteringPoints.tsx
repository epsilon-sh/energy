import "./meteringPoints.css";

import { FC, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface MeteringPointsProps {
  selectedMeteringPoint: string;
}

const MeteringPoints: FC<MeteringPointsProps> = ({ selectedMeteringPoint }) => {
  const [meteringPoints, setMeteringPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8989";

  useEffect(() => {
    fetch(new URL("/meteringPoints", API_URL))
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch metering points: ${res.statusText}`);
        }
        return res.json();
      })
      .then((points) => setMeteringPoints(points.filter(Boolean)))
      .catch((err) => {
        console.error(err);
        setError("Failed to load metering points. Please try again later.");
      });
  }, []);

  const handleChange = (meteringPoint: string) => {
    setSearchParams((prev) => {
      prev.set("meteringPoint", meteringPoint);
      return prev;
    });
  };

  return (
    <>
      {meteringPoints.map((id) => (
        <input
          type="radio"
          id={`metering-point-${id}`}
          name="meteringPoint"
          value={id}
          // checked={selectedMeteringPoint === id}
          onChange={(e) => handleChange(e.target.value)}
          className="metering-point-radio display-none"
          key={`rb_${id}`}
        />
      ))}
      {meteringPoints
        .filter(x => x !== selectedMeteringPoint)
        .map((id) => (
          <label htmlFor={`metering-point-${id}`} className="metering-point-label" key={id}>
            {id}
          </label>
      ))}
      {error && <div className="error-message">{error}</div>}
    </>
  );
};

export default MeteringPoints;
