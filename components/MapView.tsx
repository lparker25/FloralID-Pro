
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PlantAnalysis } from '../types';
import { GoogleGenAI } from "@google/genai";

interface MapViewProps {
  history: PlantAnalysis[];
}

const MapView: React.FC<MapViewProps> = ({ history }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [locationInsight, setLocationInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const points = history.filter(p => p.coordinates).map(p => ({
    lat: p.coordinates!.lat,
    lng: p.coordinates!.lng,
    name: p.name,
    isInvasive: p.isInvasive
  }));

  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const width = 800;
    const height = 500;
    const padding = 50;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Scales
    const xScale = d3.scaleLinear()
      .domain([(d3.min(points, (d: any) => d.lng) as any as number) - 0.01, (d3.max(points, (d: any) => d.lng) as any as number) + 0.01])
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([(d3.min(points, (d: any) => d.lat) as any as number) - 0.01, (d3.max(points, (d: any) => d.lat) as any as number) + 0.01])
      .range([height - padding, padding]);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height - padding})`)
      .call(d3.axisBottom(xScale).ticks(10).tickSize(-height + 2 * padding).tickFormat(() => ""))
      .style("stroke", "#e2e8f0")
      .style("stroke-opacity", 0.5);

    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${padding},0)`)
      .call(d3.axisLeft(yScale).ticks(10).tickSize(-width + 2 * padding).tickFormat(() => ""))
      .style("stroke", "#e2e8f0")
      .style("stroke-opacity", 0.5);

    // Heatmap circles (density)
    const densityData = d3.contourDensity<{lat: number, lng: number, name: string, isInvasive: boolean}>()
      .x(d => xScale(d.lng))
      .y(d => yScale(d.lat))
      .size([width, height])
      .bandwidth(20)
      (points);

    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, d3.max(densityData, d => d.value)!]);

    svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "none")
      .selectAll("path")
      .data(densityData)
      .enter().append("path")
      .attr("d", d3.geoPath())
      .attr("fill", d => colorScale(d.value))
      .attr("opacity", 0.3);

    // Points
    svg.selectAll("circle")
      .data(points)
      .enter()
      .append("circle")
      .attr("cx", (d: any) => xScale(d.lng))
      .attr("cy", (d: any) => yScale(d.lat))
      .attr("r", 5)
      .attr("fill", (d: any) => d.isInvasive ? "#ef4444" : "#10b981")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d: any) {
        d3.select(this).attr("r", 8);
        svg.append("text")
          .attr("id", "tooltip")
          .attr("x", xScale(d.lng) + 10)
          .attr("y", yScale(d.lat) - 10)
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .attr("fill", "#1e293b")
          .text(`${d.name}`);
      })
      .on("mouseout", function() {
        d3.select(this).attr("r", 5);
        svg.select("#tooltip").remove();
      });

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - padding})`)
      .call(d3.axisBottom(xScale).ticks(5));

    svg.append("g")
      .attr("transform", `translate(${padding},0)`)
      .call(d3.axisLeft(yScale).ticks(5));

  }, [points]);

  const generateInsight = async () => {
    if (points.length === 0) return;
    setIsGeneratingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze these plant observation coordinates and provide insights about the locations. Are there any specific parks, nature reserves, or environmental factors near these coordinates? 
        Coordinates: ${JSON.stringify(points.map(p => ({ lat: p.lat, lng: p.lng, name: p.name })))}`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: points[0].lat,
                longitude: points[0].lng
              }
            }
          }
        }
      });

      setLocationInsight(response.text || "No insights available.");
      
      // Extract Maps URLs if available
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        console.log("Maps Grounding Chunks:", chunks);
      }
    } catch (err) {
      console.error(err);
      setLocationInsight("Error generating insights.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Observation Heatmap</h2>
          <p className="text-slate-500">Visualizing plant discovery density and invasive clusters.</p>
        </div>
        <button 
          onClick={generateInsight}
          disabled={isGeneratingInsight || points.length === 0}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all"
        >
          {isGeneratingInsight ? (
            <i className="fas fa-circle-notch animate-spin"></i>
          ) : (
            <i className="fas fa-map-marked-alt"></i>
          )}
          Get Location Insights
        </button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
        {points.length > 0 ? (
          <div className="relative w-full overflow-x-auto flex justify-center">
            <svg ref={svgRef} width="800" height="500" className="max-w-full h-auto"></svg>
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-3 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Safe Species</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Invasive Species</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-2 bg-gradient-to-r from-yellow-100 to-red-600 opacity-50"></div>
                <span>Density Heatmap</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">
            <i className="fas fa-map-marker-alt text-5xl mb-4 opacity-10"></i>
            <p>No GPS data available. Analyze plants with location services enabled.</p>
          </div>
        )}
      </div>

      {locationInsight && (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-4 text-emerald-800">
            <i className="fas fa-lightbulb text-xl"></i>
            <h3 className="text-lg font-bold">AI Location Insights</h3>
          </div>
          <div className="prose prose-emerald max-w-none text-emerald-900">
            {locationInsight}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
