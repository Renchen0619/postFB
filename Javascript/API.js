
/**
 * 讀取並解析 INI 檔案
 * @param {string} filePath - INI 檔案的路徑
 * @returns {Promise<Object>} - 回傳解析後的物件
 */
export async function getIni(filePath) {
	try {
		// 加入時間戳避免瀏覽器快取舊的設定
		const response = await fetch(filePath + '?t=' + Date.now());
		if (!response.ok) throw new Error(`找不到檔案: ${filePath}`);
		
		const text = await response.text();
		const config = {};
		const lines = text.split(/\r?\n/);

		lines.forEach(line => {
			line = line.trim();
			if (!line || line.startsWith(';') || line.startsWith('#')) return;
			const index = line.indexOf('=');
			if (index !== -1) {
				const key = line.substring(0, index).trim();
				const value = line.substring(index + 1).trim();
				config[key] = value;
			}
		});
		return config;
	} catch (e) {
		console.error("INI Error:", e);
		return null;
	}
}