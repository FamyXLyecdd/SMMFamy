/**
 * SMMFamy - Charts Component
 * SVG-based charts without external dependencies | ~550 lines
 */

const Charts = {
    // Color palette
    colors: [
        '#a855f7', '#c084fc', '#e879f9', '#f472b6',
        '#fb7185', '#f97316', '#facc15', '#84cc16',
        '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
    ],

    /**
     * Create bar chart
     */
    bar(containerId, options = {}) {
        const defaults = {
            data: [],
            labels: [],
            barColor: '#a855f7',
            barHoverColor: '#c084fc',
            showValues: true,
            showGrid: true,
            showLabels: true,
            animated: true,
            horizontal: false,
            height: 300,
            padding: 40,
            barPadding: 0.2,
            formatValue: (v) => v
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(containerId);
        if (!container) return null;

        const { data, labels, height, padding, horizontal } = config;
        const width = container.clientWidth || 400;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data, 1);
        const barWidth = chartWidth / data.length * (1 - config.barPadding);
        const barGap = chartWidth / data.length * config.barPadding;

        let svg = `
            <svg width="${width}" height="${height}" class="chart chart-bar" viewBox="0 0 ${width} ${height}">
        `;

        // Grid lines
        if (config.showGrid) {
            for (let i = 0; i <= 4; i++) {
                const y = padding + (chartHeight / 4) * i;
                svg += `
                    <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" 
                          stroke="var(--border-default)" stroke-dasharray="4"/>
                `;
            }
        }

        // Bars
        data.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = padding + index * (barWidth + barGap) + barGap / 2;
            const y = padding + chartHeight - barHeight;

            svg += `
                <g class="chart-bar-group" data-index="${index}">
                    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
                          fill="${config.barColor}" rx="4"
                          class="chart-bar-rect ${config.animated ? 'chart-animate-in' : ''}"
                          style="${config.animated ? `animation-delay: ${index * 50}ms` : ''}">
                        <title>${labels[index]}: ${config.formatValue(value)}</title>
                    </rect>
            `;

            // Value label
            if (config.showValues) {
                svg += `
                    <text x="${x + barWidth / 2}" y="${y - 8}" 
                          text-anchor="middle" fill="var(--text-secondary)" 
                          font-size="12" font-weight="600">
                        ${config.formatValue(value)}
                    </text>
                `;
            }

            // X-axis label
            if (config.showLabels && labels[index]) {
                svg += `
                    <text x="${x + barWidth / 2}" y="${height - 10}" 
                          text-anchor="middle" fill="var(--text-muted)" font-size="11">
                        ${labels[index]}
                    </text>
                `;
            }

            svg += '</g>';
        });

        svg += '</svg>';
        container.innerHTML = svg;

        return { container, config, update: (newData) => this.bar(containerId, { ...config, data: newData }) };
    },

    /**
     * Create line chart
     */
    line(containerId, options = {}) {
        const defaults = {
            data: [],
            labels: [],
            lineColor: '#a855f7',
            fillColor: 'rgba(168, 85, 247, 0.1)',
            pointColor: '#a855f7',
            showPoints: true,
            showFill: true,
            showGrid: true,
            showLabels: true,
            animated: true,
            curved: true,
            height: 300,
            padding: 40,
            formatValue: (v) => v
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(containerId);
        if (!container) return null;

        const { data, labels, height, padding } = config;
        const width = container.clientWidth || 400;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data, 1);
        const stepX = chartWidth / (data.length - 1 || 1);

        // Calculate points
        const points = data.map((value, index) => ({
            x: padding + index * stepX,
            y: padding + chartHeight - (value / maxValue) * chartHeight,
            value,
            label: labels[index]
        }));

        // Build path
        let pathD = '';
        if (config.curved && points.length > 2) {
            // Bezier curve
            pathD = `M ${points[0].x} ${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[Math.max(i - 1, 0)];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[Math.min(i + 2, points.length - 1)];

                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;

                pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
        } else {
            pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        }

        let svg = `
            <svg width="${width}" height="${height}" class="chart chart-line" viewBox="0 0 ${width} ${height}">
                <defs>
                    <linearGradient id="lineGradient-${containerId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="${config.lineColor}" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="${config.lineColor}" stop-opacity="0"/>
                    </linearGradient>
                </defs>
        `;

        // Grid lines
        if (config.showGrid) {
            for (let i = 0; i <= 4; i++) {
                const y = padding + (chartHeight / 4) * i;
                svg += `
                    <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" 
                          stroke="var(--border-default)" stroke-dasharray="4"/>
                `;
            }
        }

        // Fill area
        if (config.showFill) {
            const fillPath = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
            svg += `
                <path d="${fillPath}" fill="url(#lineGradient-${containerId})" 
                      class="${config.animated ? 'chart-animate-fill' : ''}"/>
            `;
        }

        // Line
        svg += `
            <path d="${pathD}" fill="none" stroke="${config.lineColor}" 
                  stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                  class="${config.animated ? 'chart-animate-line' : ''}"/>
        `;

        // Points
        if (config.showPoints) {
            points.forEach((point, index) => {
                svg += `
                    <circle cx="${point.x}" cy="${point.y}" r="5" 
                            fill="white" stroke="${config.pointColor}" stroke-width="2"
                            class="chart-point" data-index="${index}">
                        <title>${point.label}: ${config.formatValue(point.value)}</title>
                    </circle>
                `;
            });
        }

        // X-axis labels
        if (config.showLabels) {
            points.forEach((point, index) => {
                if (index % Math.ceil(points.length / 7) === 0 || index === points.length - 1) {
                    svg += `
                        <text x="${point.x}" y="${height - 10}" 
                              text-anchor="middle" fill="var(--text-muted)" font-size="11">
                            ${point.label || ''}
                        </text>
                    `;
                }
            });
        }

        svg += '</svg>';
        container.innerHTML = svg;

        return { container, config, update: (newData) => this.line(containerId, { ...config, data: newData }) };
    },

    /**
     * Create donut/pie chart
     */
    donut(containerId, options = {}) {
        const defaults = {
            data: [],
            labels: [],
            colors: this.colors,
            showLegend: true,
            showLabels: true,
            showTotal: true,
            totalLabel: 'Total',
            donut: true,
            donutRatio: 0.6,
            height: 300,
            animated: true,
            formatValue: (v) => v
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(containerId);
        if (!container) return null;

        const { data, labels, height, donut, donutRatio } = config;
        const width = container.clientWidth || 400;
        const total = data.reduce((a, b) => a + b, 0);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const innerRadius = donut ? radius * donutRatio : 0;

        let svg = `
            <svg width="${width}" height="${height}" class="chart chart-donut" viewBox="0 0 ${width} ${height}">
        `;

        let startAngle = -90;

        data.forEach((value, index) => {
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const angle = (percentage / 100) * 360;
            const endAngle = startAngle + angle;

            const start = this.polarToCartesian(centerX, centerY, radius, startAngle);
            const end = this.polarToCartesian(centerX, centerY, radius, endAngle);
            const innerStart = this.polarToCartesian(centerX, centerY, innerRadius, startAngle);
            const innerEnd = this.polarToCartesian(centerX, centerY, innerRadius, endAngle);

            const largeArcFlag = angle > 180 ? 1 : 0;

            let pathD;
            if (donut) {
                pathD = [
                    `M ${start.x} ${start.y}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
                    `L ${innerEnd.x} ${innerEnd.y}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
                    'Z'
                ].join(' ');
            } else {
                pathD = [
                    `M ${centerX} ${centerY}`,
                    `L ${start.x} ${start.y}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
                    'Z'
                ].join(' ');
            }

            const color = config.colors[index % config.colors.length];

            svg += `
                <path d="${pathD}" fill="${color}" 
                      class="chart-slice ${config.animated ? 'chart-animate-slice' : ''}"
                      data-index="${index}"
                      style="${config.animated ? `animation-delay: ${index * 100}ms` : ''}">
                    <title>${labels[index]}: ${config.formatValue(value)} (${percentage.toFixed(1)}%)</title>
                </path>
            `;

            startAngle = endAngle;
        });

        // Center text
        if (donut && config.showTotal) {
            svg += `
                <text x="${centerX}" y="${centerY - 10}" text-anchor="middle" 
                      fill="var(--text-primary)" font-size="24" font-weight="700">
                    ${config.formatValue(total)}
                </text>
                <text x="${centerX}" y="${centerY + 15}" text-anchor="middle" 
                      fill="var(--text-muted)" font-size="12">
                    ${config.totalLabel}
                </text>
            `;
        }

        svg += '</svg>';

        // Legend
        if (config.showLegend) {
            let legend = '<div class="chart-legend">';
            data.forEach((value, index) => {
                const color = config.colors[index % config.colors.length];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                legend += `
                    <div class="chart-legend-item">
                        <span class="chart-legend-color" style="background: ${color}"></span>
                        <span class="chart-legend-label">${labels[index] || `Item ${index + 1}`}</span>
                        <span class="chart-legend-value">${percentage}%</span>
                    </div>
                `;
            });
            legend += '</div>';
            svg += legend;
        }

        container.innerHTML = svg;

        return { container, config, update: (newData) => this.donut(containerId, { ...config, data: newData }) };
    },

    /**
     * Create progress ring
     */
    progressRing(containerId, options = {}) {
        const defaults = {
            value: 0,
            max: 100,
            size: 120,
            strokeWidth: 8,
            color: '#a855f7',
            bgColor: 'var(--border-default)',
            showValue: true,
            showPercent: true,
            animated: true,
            formatValue: (v, max) => `${Math.round((v / max) * 100)}%`
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(containerId);
        if (!container) return null;

        const { value, max, size, strokeWidth, color, bgColor } = config;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const progress = Math.min(value / max, 1);
        const offset = circumference * (1 - progress);

        const svg = `
            <svg width="${size}" height="${size}" class="chart chart-progress-ring" viewBox="0 0 ${size} ${size}">
                <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
                        fill="none" stroke="${bgColor}" stroke-width="${strokeWidth}"/>
                <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
                        fill="none" stroke="${color}" stroke-width="${strokeWidth}"
                        stroke-linecap="round"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${config.animated ? circumference : offset}"
                        transform="rotate(-90 ${size / 2} ${size / 2})"
                        class="chart-progress-ring-circle ${config.animated ? 'chart-animate-ring' : ''}"
                        style="--target-offset: ${offset}"/>
                ${config.showValue ? `
                    <text x="${size / 2}" y="${size / 2}" text-anchor="middle" 
                          dominant-baseline="middle" fill="var(--text-primary)" 
                          font-size="${size / 4}" font-weight="700">
                        ${config.formatValue(value, max)}
                    </text>
                ` : ''}
            </svg>
        `;

        container.innerHTML = svg;

        // Trigger animation
        if (config.animated) {
            requestAnimationFrame(() => {
                const circle = container.querySelector('.chart-progress-ring-circle');
                if (circle) {
                    circle.style.strokeDashoffset = offset;
                }
            });
        }

        return {
            container,
            config,
            update: (newValue) => this.progressRing(containerId, { ...config, value: newValue })
        };
    },

    /**
     * Create sparkline
     */
    sparkline(containerId, options = {}) {
        const defaults = {
            data: [],
            color: '#a855f7',
            fillColor: 'rgba(168, 85, 247, 0.2)',
            showFill: true,
            width: 100,
            height: 30,
            strokeWidth: 2
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(containerId);
        if (!container) return null;

        const { data, width, height, strokeWidth } = config;
        if (data.length === 0) {
            container.innerHTML = '';
            return null;
        }

        const padding = strokeWidth;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data, 1);
        const minValue = Math.min(...data, 0);
        const range = maxValue - minValue || 1;
        const stepX = chartWidth / (data.length - 1 || 1);

        const points = data.map((value, index) => ({
            x: padding + index * stepX,
            y: padding + chartHeight - ((value - minValue) / range) * chartHeight
        }));

        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const fillPath = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

        const svg = `
            <svg width="${width}" height="${height}" class="chart chart-sparkline" viewBox="0 0 ${width} ${height}">
                ${config.showFill ? `
                    <path d="${fillPath}" fill="${config.fillColor}"/>
                ` : ''}
                <path d="${pathD}" fill="none" stroke="${config.color}" 
                      stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        container.innerHTML = svg;

        return { container, config, update: (newData) => this.sparkline(containerId, { ...config, data: newData }) };
    },

    /**
     * Helper: Convert polar to cartesian coordinates
     */
    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees * Math.PI) / 180;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians)
        };
    }
};

// Chart styles
const chartStyles = document.createElement('style');
chartStyles.textContent = `
    .chart {
        display: block;
    }
    
    .chart-bar-rect {
        transition: fill 0.2s ease;
        cursor: pointer;
    }
    
    .chart-bar-group:hover .chart-bar-rect {
        filter: brightness(1.1);
    }
    
    .chart-slice {
        transition: transform 0.2s ease, filter 0.2s ease;
        cursor: pointer;
        transform-origin: center;
    }
    
    .chart-slice:hover {
        transform: scale(1.02);
        filter: brightness(1.1);
    }
    
    .chart-point {
        transition: r 0.2s ease;
        cursor: pointer;
    }
    
    .chart-point:hover {
        r: 7;
    }
    
    .chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        justify-content: center;
        margin-top: var(--space-3);
    }
    
    .chart-legend-item {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--text-sm);
    }
    
    .chart-legend-color {
        width: 12px;
        height: 12px;
        border-radius: var(--radius-sm);
    }
    
    .chart-legend-value {
        color: var(--text-muted);
    }
    
    .chart-progress-ring-circle {
        transition: stroke-dashoffset 1s ease-out;
    }
    
    @keyframes chart-animate-in {
        from {
            transform: scaleY(0);
            transform-origin: bottom;
        }
        to {
            transform: scaleY(1);
        }
    }
    
    .chart-animate-in {
        animation: chart-animate-in 0.5s ease-out forwards;
    }
    
    @keyframes chart-animate-line {
        from {
            stroke-dashoffset: 2000;
        }
        to {
            stroke-dashoffset: 0;
        }
    }
    
    .chart-animate-line {
        stroke-dasharray: 2000;
        animation: chart-animate-line 1.5s ease-out forwards;
    }
    
    @keyframes chart-animate-slice {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    .chart-animate-slice {
        animation: chart-animate-slice 0.5s ease-out forwards;
    }
`;

document.head.appendChild(chartStyles);

// Export for use
window.Charts = Charts;
