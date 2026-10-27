import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatNumber } from "../utils/format";

export default function PriceTrendChart({ trends, prediction }) {
  const observedSeries = prediction?.available && prediction.history?.length
    ? prediction.history
    : trends;
  const chartData = observedSeries.map((item) => ({
    ...item,
    label: item.date.slice(5),
  }));
  const unit = prediction?.unit || chartData[0]?.unit;
  const priceLabel = `FCFA${unit ? `/${unit}` : ""}`;
  const data = prediction?.available
    ? [
      ...chartData,
      ...prediction.forecast.map((item) => ({
        date: item.date,
        label: item.date.slice(5),
        predicted_price: item.predicted_price,
      })),
    ]
    : chartData;

  return (
    <div className="chart-wrap">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eeea" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={20} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}
              formatter={(value, name) => [
                `${formatNumber(value)} ${priceLabel}`,
                name === "predicted_price" ? "Prévision" : "Prix observé",
              ]}
            />
            <Line
              type="monotone"
              dataKey="price"
              name="Prix observé"
              stroke="#16866a"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="predicted_price"
              name="Prévision"
              stroke="#d68b25"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">Aucune tendance disponible pour cette sélection.</div>
      )}
    </div>
  );
}
