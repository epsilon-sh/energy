import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface DrawerProps {
  trackerCheckboxId: string;
}

const Drawer: React.FC<DrawerProps> = ({ trackerCheckboxId }) => {
  const [meteringPoints, setMeteringPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMeteringPoint = searchParams.get("meteringPoint");
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

  const handleMeteringPointChange = (meteringPoint: string) => {
    setSearchParams((prev) => {
      prev.set("meteringPoint", meteringPoint);
      return prev;
    });
  };

  return (
    <>

      <label htmlFor={trackerCheckboxId} className="drawer-overlay" />
      <nav className="drawer">
        <h3>Metering Points</h3>
        <div className="metering-points-list">
          {meteringPoints.map((id) => (
            <div key={id} className="metering-point-item">
              <input
                type="radio"
                id={`metering-point-${id}`}
                name="meteringPoint"
                value={id}
                checked={selectedMeteringPoint === id}
                onChange={(e) => handleMeteringPointChange(e.target.value)}
                className="metering-point-radio display-none"
              />
              <label htmlFor={`metering-point-${id}`} className="metering-point-label">
                {id}
              </label>
            </div>
          ))}
          {error && <div className="error-message">{error}</div>}
        </div>
      </nav>
    </>
  );
};

export default Drawer;
