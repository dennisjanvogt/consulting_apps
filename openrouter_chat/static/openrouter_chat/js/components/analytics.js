class AnalyticsManager {
  async showModal() {
    try {
      const summary = await API.getAnalyticsSummary();
      const usage = await API.getUsageStats('30d');
      
      Modal.show({
        title: 'Analytics Dashboard',
        size: 'xl',
        content: this.renderAnalytics(summary, usage),
        buttons: [
          {
            text: 'Export Data',
            className: 'btn-secondary',
            onClick: () => this.exportData(summary, usage)
          },
          {
            text: 'Close',
            className: 'btn-primary',
            onClick: () => Modal.close()
          }
        ]
      });
      
      this.renderCharts(usage);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      alert('Failed to load analytics');
    }
  }
  
  renderAnalytics(summary, usage) {
    return `
      <div class="analytics-summary">
        <div class="stat-card">
          <div class="stat-value">${summary.total.total_sessions || 0}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.total.total_messages || 0}</div>
          <div class="stat-label">Total Messages</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$${(summary.total.total_cost || 0).toFixed(4)}</div>
          <div class="stat-label">Total Cost</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.today.messages || 0}</div>
          <div class="stat-label">Messages Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$${(summary.today.cost || 0).toFixed(4)}</div>
          <div class="stat-label">Cost Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$${(summary.thisMonth.cost || 0).toFixed(4)}</div>
          <div class="stat-label">Cost This Month</div>
        </div>
      </div>
      
      <div class="chart-container">
        <h4 class="chart-title">Usage Over Time</h4>
        <canvas id="usageChart" width="400" height="200"></canvas>
      </div>
      
      <div class="chart-container">
        <h4 class="chart-title">Model Usage</h4>
        <table class="usage-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Messages</th>
              <th>Input Tokens</th>
              <th>Output Tokens</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            ${usage.modelUsage.map(model => `
              <tr>
                <td>${model.model}</td>
                <td>${model.message_count}</td>
                <td>${model.input_tokens || 0}</td>
                <td>${model.output_tokens || 0}</td>
                <td>$${(model.total_cost || 0).toFixed(6)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="chart-container">
        <h4 class="chart-title">Top Models</h4>
        <canvas id="modelChart" width="400" height="200"></canvas>
      </div>
    `;
  }
  
  async renderCharts(usage) {
    // Get historical data
    const history = await API.getUsageHistory(30);
    
    // Usage over time chart (simplified without Chart.js)
    const usageCanvas = document.getElementById('usageChart');
    if (usageCanvas) {
      const ctx = usageCanvas.getContext('2d');
      this.drawLineChart(ctx, history.history);
    }
    
    // Model usage pie chart (simplified)
    const modelCanvas = document.getElementById('modelChart');
    if (modelCanvas) {
      const ctx = modelCanvas.getContext('2d');
      this.drawPieChart(ctx, usage.modelUsage);
    }
  }
  
  drawLineChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) {
      ctx.fillStyle = '#71717A';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }
    
    // Find max value
    const maxCost = Math.max(...data.map(d => d.cost || 0));
    
    // Draw axes
    ctx.strokeStyle = '#71717A';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw data points and lines
    ctx.strokeStyle = '#2E3F8F';
    ctx.fillStyle = '#2E3F8F';
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.cost || 0) / maxCost) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis labels (dates)
    if (data.length > 0) {
      ctx.fillText(data[0].date, padding, height - padding + 20);
      ctx.fillText(data[data.length - 1].date, width - padding, height - padding + 20);
    }
    
    // Y-axis label
    ctx.save();
    ctx.translate(padding - 20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Cost ($)`, 0, 0);
    ctx.restore();
  }
  
  drawPieChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) {
      ctx.fillStyle = '#71717A';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', centerX, centerY);
      return;
    }
    
    // Calculate total
    const total = data.reduce((sum, item) => sum + item.message_count, 0);
    
    // Colors for pie slices
    const colors = ['#2E3F8F', '#667EEA', '#764BA2', '#F59E0B', '#10B981', '#EF4444'];
    
    let currentAngle = -Math.PI / 2;
    
    data.slice(0, 6).forEach((item, index) => {
      const sliceAngle = (item.message_count / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
      
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.model.split('/').pop(), labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  }
  
  exportData(summary, usage) {
    const data = {
      summary,
      usage,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

window.Analytics = new AnalyticsManager();