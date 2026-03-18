/**
 * 天气查询技能
 * 
 * 功能：查询指定城市的当前天气和预报
 * 数据源：wttr.in（免费，无需 API Key）
 */

const config = {
  defaultCity: 'Beijing',
  cityAliases: {
    '北京': 'Beijing',
    '上海': 'Shanghai',
    '广州': 'Guangzhou',
    '深圳': 'Shenzhen'
  }
};

/**
 * 查询天气
 * @param {Object} context - 请求上下文
 */
async function getWeather(context = {}) {
  const city = resolveCity(context.city || config.defaultCity);
  console.log(`🌤️  查询天气：${city}`);
  
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
  const response = await fetch(url);
  const data = await response.json();
  
  return formatWeather(data, city);
}

function resolveCity(city) {
  return config.cityAliases[city] || city;
}

function formatWeather(data, cityName) {
  const current = data.current_condition[0];
  const forecast = data.weather.slice(0, 3);
  
  return {
    city: cityName,
    temperature: `${current.temp_C}°C`,
    condition: current.weatherDesc[0].value,
    humidity: `${current.humidity}%`,
    windSpeed: `${current.windspeedKmph} km/h`,
    forecast: forecast.map(day => ({
      date: day.date,
      maxTemp: `${day.maxtempC}°C`,
      minTemp: `${day.mintempC}°C`
    }))
  };
}

function formatMessage(weather) {
  const { city, temperature, condition, humidity, forecast } = weather;
  
  let msg = `🌤️ **${city} 天气**\n\n`;
  msg += `🌡️  温度：${temperature}\n`;
  msg += `🌤️  状况：${condition}\n`;
  msg += `💧  湿度：${humidity}\n\n`;
  msg += `📅 **未来 3 天**\n`;
  
  for (const day of forecast) {
    msg += `${day.date}: ${day.minTemp} ~ ${day.maxTemp}\n`;
  }
  
  return msg;
}

module.exports = { getWeather, formatMessage };
