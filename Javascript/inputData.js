import * as utils from './API.js';

// --- 1. 配置設定 ---
const iniPath = 'settings/inputData.ini';
const GITHUB_USER = "Renchen0619";
const GITHUB_REPO = "postFB";
const GITHUB_PATH = "pic"; 

let updateGithub_URL = "";
let updateData_URL = "";
let finalToken = ""; 

/**
 * 初始化：讀取設定檔並綁定時間
 */
async function initApp() {
	try {
		const config = await utils.getIni(iniPath);
		updateGithub_URL = config.updateGithub_URL; 
		updateData_URL = config.updateData_URL;
		updateTime();
		console.log("✅ 系統設定載入成功");
	} catch (e) {
		console.error("❌ 初始化失敗:", e);
	}
}

function updateTime() {
	const now = new Date();
	const pad = (n) => n.toString().padStart(2, '0');
	const dateInput = document.getElementById('date');
	if (dateInput) {
		dateInput.value = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
	}
}

async function checkUser() {
	const userName = document.getElementById('token').value.trim();
	if (!userName) { alert("請輸入使用者名稱！"); return false; }
	const status = document.getElementById('status');
	status.innerText = "⏳ 正在驗證身分...";
	status.style.color = "orange";
	
	const authUrl = atob(updateGithub_URL);
	try {
		const response = await fetch(authUrl, {
			method: "POST",
			body: JSON.stringify({ action: "getGithubToken", user: userName })
		});
		const result = await response.json();
		if (result.success) {
			finalToken = result.githubToken; 
			status.innerText = "✅ 驗證通過：歡迎 " + userName;
			status.style.color = "green";
			return true;
		} else {
			status.innerText = "❌ 驗證失敗：" + result.message;
			status.style.color = "red";
			return false;
		}
	} catch (e) {
		status.innerText = "⚠️ 驗證連線失敗";
		return false;
	}
}

// --- 核心功能：多檔案上傳並使用換行符號隔開路徑 ---
window.uploadToGithub = async function() {
	if (!finalToken) {
		const ok = await checkUser();
		if (!ok) return;
	}

	const fileInput = document.getElementById('fileInput');
	const status = document.getElementById('status');
	const picInput = document.getElementById('pic');
	
	if (fileInput.files.length === 0) { alert("請先選擇檔案！"); return; }

	status.innerText = `⏳ 準備上傳 ${fileInput.files.length} 個檔案...`;
	status.style.color = "blue";

	let uploadedPaths = [];

	// 取得當前時間基礎，用於命名
	const now = new Date();
	const pad = (n) => n.toString().padStart(2, '0');
	const dateBase = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + 
					 pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

	for (let i = 0; i < fileInput.files.length; i++) {
		const file = fileInput.files[i];
		
		// 生成唯一檔名：YYYYMMDDHHmmss + 序號
		const fileExt = file.name.split('.').pop().toLowerCase();
		const fileName = `${dateBase}${i}.${fileExt}`;
		const filePath = `${GITHUB_PATH}/${fileName}`;

		status.innerText = `⏳ 正在上傳 (${i + 1}/${fileInput.files.length}): ${fileName}`;

		try {
			const base64 = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onload = () => resolve(reader.result.split(',')[1]);
				reader.onerror = (e) => reject(e);
			});

			const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`;
			const res = await fetch(apiUrl, {
				method: "PUT",
				headers: {
					"Authorization": `token ${finalToken}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					message: `Upload: ${fileName}`,
					content: base64
				})
			});

			if (res.ok) {
				uploadedPaths.push(filePath);
			} else {
				const errJson = await res.json();
				throw new Error(errJson.message || "上傳失敗");
			}
		} catch (e) {
			console.error(e);
			status.innerText = `❌ 部分失敗: ${e.message}`;
			status.style.color = "red";
			return;
		}
	}

	// --- 重點修改：使用換行符號 (\n) 隔開路徑 ---
	picInput.value = uploadedPaths.join('|');
	status.innerText = `✅ 成功上傳 ${uploadedPaths.length} 個檔案！`;
	status.style.color = "green";
}

window.sendData = async function() {
	if (!finalToken) {
		const ok = await checkUser();
		if (!ok) return;
	}

	const dbUrl = atob(updateData_URL);
	const status = document.getElementById('status');
	status.innerText = "🚀 正在傳送資料至資料庫...";

	try {
		await fetch(dbUrl, {
			method: "POST",
			mode: "no-cors", 
			headers: { "Content-Type": "text/plain" },
			body: JSON.stringify({
				token: finalToken,
				date: document.getElementById('date').value,
				title: document.getElementById('title').value,
				content: document.getElementById('content').value,
				pic: document.getElementById('pic').value // 這裡會包含換行的多條路徑
			})
		});

		status.innerText = "✅ 全數完成！資料已匯入資料庫。";
		status.style.color = "green";
		
		// 清空輸入
		document.getElementById('title').value = "";
		document.getElementById('content').value = "";
		document.getElementById('pic').value = "";
		document.getElementById('fileInput').value = "";
		updateTime();

	} catch (e) {
		status.innerText = "❌ 資料庫匯入失敗。";
		console.error(e);
	}
}

initApp();