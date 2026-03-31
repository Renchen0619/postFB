import { getIni } from './API.js';

let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
let favorites = JSON.parse(localStorage.getItem('novel_favs')) || [];
let showOnlyFavs = false; 

let API_URL = "";
let appConfig = {};

async function initApp() {
	const iniPath = 'settings/postFB.ini'; 
	const config = await getIni(iniPath);
	
	if (config && config.API_URL) {
		API_URL = atob(config.API_URL);
		await loadData();
	} else {
		console.error("無法從 INI 取得 API_URL");
	}
}

async function loadData() {
	const list = document.getElementById('post-list');
	const localData = localStorage.getItem('cached_novel_data');
	if (localData) {
		allPosts = JSON.parse(localData);
		updateTitleDropdown();
		updateDisplay();
	} else {
		list.innerHTML = '<div style="text-align:center; padding:50px; color:#888;">正在載入小說資料...</div>';
	}

	try {
		const res = await fetch(API_URL);
		const newData = await res.json();
		
		if (JSON.stringify(newData) !== localData) {
			allPosts = newData;
			localStorage.setItem('cached_novel_data', JSON.stringify(newData));
			updateTitleDropdown();
			updateDisplay();
		}
	} catch (e) {
		console.error("更新失敗", e);
	}
}

function updateTitleDropdown() {
	const titleFilter = document.getElementById('titleFilter');
	const titles = [...new Set(allPosts.map(p => p["標題"]).filter(t => t))];
	titles.sort();
	titles.forEach(title => {
		const opt = document.createElement('option');
		opt.value = title;
		opt.innerText = title;
		titleFilter.appendChild(opt);
	});
}

function updateDisplay() {
	const term = document.getElementById('search').value.toLowerCase();
	const selectedTitle = document.getElementById('titleFilter').value
	const order = document.getElementById('sortOrder').value;
	const sizeValue = document.getElementById('pageSize').value;
	
	filteredPosts = allPosts.filter(p => {
		const content = (p["貼文內容"] || "").toLowerCase();
		const title = (p["標題"] || "").toLowerCase();
		const contentMatch = content.includes(term) || title.includes(term);
		const titleMatch = selectedTitle === "" || p["標題"] === selectedTitle;
		const favMatch = !showOnlyFavs || favorites.includes(p["ID"] || p["發佈日期"]);
		return contentMatch && titleMatch && favMatch;
	});

	filteredPosts.sort((a, b) => {
		const dA = new Date(a["發佈日期"] || 0);
		const dB = new Date(b["發佈日期"] || 0);
		return order === 'asc' ? dA - dB : dB - dA;
	});

	const pageSize = sizeValue === 'all' ? filteredPosts.length : parseInt(sizeValue);
	const maxPage = Math.ceil(filteredPosts.length / pageSize) || 1;
	if (currentPage > maxPage) currentPage = maxPage;
	
	const start = (currentPage - 1) * pageSize;
	const pagedData = filteredPosts.slice(start, start + pageSize);

	document.getElementById('pageNum').innerText = `${currentPage} / ${maxPage}\n共 ${filteredPosts.length} 筆`;
	document.getElementById('prevBtn').disabled = (currentPage === 1);
	document.getElementById('nextBtn').disabled = (currentPage === maxPage);

	renderList(pagedData);
}

// --- 核心修改點 1：renderList 中的圖片解析 ---
function renderList(posts) {
	const list = document.getElementById('post-list');
	list.innerHTML = '';
	const fragment = document.createDocumentFragment();
	posts.forEach(post => {
		const card = document.createElement('div');
		card.className = 'post-card';
		const summary = (post["貼文內容"] || "").substring(0, 60) + "...";
		const date = formatDate(post["發佈日期"]);
		const imgData = post["圖片網址"] || post["圖片"] || "";
		const isFav = favorites.includes(post["ID"] || post["發佈日期"]);
		const favStar = `<span class="fav-btn ${isFav ? 'active' : ''}" 
					onclick="toggleFavorite('${post["ID"] || post["發佈日期"]}', event)">
					${isFav ? '★' : '☆'}</span>`;
					
		let imgHtml = "";
		if (imgData) {
			imgHtml += `<div class="thumb-img-container">`;
			// 使用正則表達式 split(/\r?\n|\|/) 同時支援換行與直線符號
			imgData.split(/\r?\n|\|/).slice(0,3).forEach(src => {
				if(src.trim()) imgHtml += `<img src="${src.trim()}" class="thumb-img" onerror="this.style.display='none'">`;
			});
			imgHtml += `</div>`;
		}
		card.innerHTML = `
			${favStar}
			<div class="post-date">${date}</div>
			<div class="post-title">${post["標題"] || "無標題"}</div>
			<div class="post-content">${summary}</div>
			${imgHtml}
		`;
		card.onclick = () => openModal(date, post["標題"], post["貼文內容"], imgData);
		fragment.appendChild(card);
	});
	list.appendChild(fragment);
}

function changePage(step) {
	currentPage += step;
	updateDisplay();
	window.scrollTo(0, 0);
}

function formatDate(raw) {
	if (!raw) return "";
	let d = (typeof raw === 'number') ? new Date((raw - 25569) * 86400 * 1000) : new Date(raw);
	if (isNaN(d.getTime())) return raw;
	return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

// --- 核心修改點 2：openModal 中的圖片解析 ---
function openModal(date, title, body, imgData) {
	document.getElementById('modal-header-title').innerText = title || "無標題";
	document.getElementById('modal-date').innerText = date;
	
	const imgContainer = document.getElementById('modal-images');
	imgContainer.innerHTML = "";
	if (imgData) {
		// 同樣改用正則表達式解析
		imgData.split(/\r?\n|\|/).forEach(src => {
			if(src.trim()) imgContainer.innerHTML += `<img src="${src.trim()}" class="modal-img">`;
		});
	}
	
	document.getElementById('modal-body').innerText = body;
	document.getElementById('postModal').style.display = 'block';
	document.body.style.overflow = 'hidden';
	document.querySelector('.modal-body-scroll').scrollTop = 0; 
}

function closeModal() {
	document.getElementById('postModal').style.display = 'none';
	document.body.style.overflow = 'auto';
}

function toggleFavorite(postId, event) {
	event.stopPropagation(); 
	const index = favorites.indexOf(postId);
	if (index > -1) {
		favorites.splice(index, 1);
	} else {
		favorites.push(postId);
	}
	localStorage.setItem('novel_favs', JSON.stringify(favorites));
	updateDisplay(); 
}

function toggleFavFilter() {
	showOnlyFavs = !showOnlyFavs;
	const btn = document.getElementById('favToggle');
	btn.classList.toggle('active');
	btn.innerText = showOnlyFavs ? '⭐ 顯示全部' : '⭐ 收藏';
	currentPage = 1;
	updateDisplay();
}

// 由於是 Module，將需要給 HTML 呼叫的函式掛載到 window
window.changePage = changePage;
window.toggleFavorite = toggleFavorite;
window.toggleFavFilter = toggleFavFilter;
window.closeModal = closeModal;

// 啟動
initApp();