import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3'

type LineChartProps = {
  title: string,
  color: string,
  max: number,
  datapoints: [[number, number]]
}

const LineChart: React.FC<LineChartProps> = ({ title, color, max, datapoints }) => {
  const svgRef = useRef() as React.MutableRefObject<SVGSVGElement>

  useEffect(() => {
    const margin = { top: 10, right: 30, bottom: 30, left: 30 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    d3.select(svgRef.current).html('')

    // Create the SVG element for the chart
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 400 200`)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)

    // Define the x and y scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(datapoints, d => new Date(d[1] * 1000)) as [Date, Date])
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain([0, max])
      .range([height, 0])

    // Define the line generator function
    const line = d3.line()
      .x(d => xScale(d[1] * 1000))
      .y(d => yScale(d[0]))

    // Add the line to the chart
    svg.append("path")
      .datum(datapoints)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line)

    // Add the x and y axes to the chart
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))

    svg.append("g")
      .call(d3.axisLeft(yScale))

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .text(title)
  }, [title, color, max, datapoints])

  return <svg ref={svgRef}/>
}

export default LineChart