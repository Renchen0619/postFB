let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
let favorites = JSON.parse(localStorage.getItem('novel_favs')) || [];
let showOnlyFavs = false; // 是否只顯示收藏

const secret = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5VjV1NkNfNU1weEJEV2k1eHptUjNFXzhOZWpOeFZqcUtQYUloYkx2RE0wM1d5Y19QWUx3bXltNVFmWWhrclYwUzNUQS9leGVj";
const API_URL = atob(secret);

async function loadData() {
	const list = document.getElementById('post-list');
	list.innerHTML = '<div style="text-align:center; padding:50px; color:#888;">正在載入小說資料...</div>';
	try {
		const res = await fetch(API_URL);
		allPosts = await res.json();
		updateTitleDropdown();
		updateDisplay();
	} catch (e) {
		list.innerHTML = '<div style="color:red; text-align:center;">連線失敗。</div>';
	}
}

function updateTitleDropdown() {
		const titleFilter = document.getElementById('titleFilter');
		// 取得所有標題，過濾掉空的，並移除重複
		const titles = [...new Set(allPosts.map(p => p["標題"]).filter(t => t))];
	
		// 排序標題（可選）
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
		const contentMatch = 	(p["貼文內容"] || "").toLowerCase().includes(term) || 
								(p["標題"] || "").toLowerCase().includes(term);
		// 如果沒選標題，就只看關鍵字；如果有選標題，標題必須完全符合
		const titleMatch = selectedTitle === "" || p["標題"] === selectedTitle;
		return contentMatch && titleMatch;
	});
	
	filteredPosts = allPosts.filter(p => {
		// 原本的搜尋條件
		const contentMatch = (p["貼文內容"] || "").toLowerCase().includes(term) || (p["標題"] || "").toLowerCase().includes(term);
		const titleMatch = selectedTitle === "" || p["標題"] === selectedTitle;
		
		// 新增：收藏過濾條件
		const favMatch = !showOnlyFavs || favorites.includes(p["ID"] || p["發佈日期"]); 
		// 註：建議資料要有唯一 ID，若無則暫用發佈日期代替
		
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

	// 分頁資訊換行顯示
	document.getElementById('pageNum').innerText = `${currentPage} / ${maxPage}\n共 ${filteredPosts.length} 筆`;
	
	// 預設不可按控制
	document.getElementById('prevBtn').disabled = (currentPage === 1);
	document.getElementById('nextBtn').disabled = (currentPage === maxPage);

	renderList(pagedData);
}

function renderList(posts) {
	const list = document.getElementById('post-list');
	list.innerHTML = '';
	posts.forEach(post => {
		const card = document.createElement('div');
		card.className = 'post-card';
		const date = formatDate(post["發佈日期"]);
		const imgData = post["圖片網址"] || post["圖片"] || "";
		const isFav = favorites.includes(post["ID"] || post["發佈日期"]);
		const favStar = `<span class="fav-btn ${isFav ? 'active' : ''}" 
					onclick="toggleFavorite('${post["ID"] || post["發佈日期"]}', event)">
					${isFav ? '★' : '☆'}</span>`;
					
		let imgHtml = "";
		if (imgData) {
			imgHtml += `<div class="thumb-img-container">`;
			imgData.split('|').slice(0,3).forEach(src => {
				if(src.trim()) imgHtml += `<img src="${src.trim()}" class="thumb-img" onerror="this.style.display='none'">`;
			});
			imgHtml += `</div>`;
		}
		card.innerHTML = `
			${favStar}
			<div class="post-date">${date}</div>
			<div class="post-title">${post["標題"] || "無標題"}</div>
			<div class="post-content">${(post["貼文內容"] || "")}</div>
			${imgHtml}
		`;
		card.onclick = () => openModal(date, post["標題"], post["貼文內容"], imgData);
		list.appendChild(card);
	});
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

function openModal(date, title, body, imgData) {
	document.getElementById('modal-header-title').innerText = title || "無標題";
	document.getElementById('modal-date').innerText = date;
	
	const imgContainer = document.getElementById('modal-images');
	imgContainer.innerHTML = "";
	if (imgData) {
		imgData.split('|').forEach(src => {
			if(src.trim()) imgContainer.innerHTML += `<img src="${src.trim()}" class="modal-img">`;
		});
	}
	
	document.getElementById('modal-body').innerText = body;
	
	document.getElementById('postModal').style.display = 'block';
	document.body.style.overflow = 'hidden';
	document.querySelector('.modal-body-scroll').scrollTop = 0; // 開啟時回到最上方
}

function closeModal() {
	document.getElementById('postModal').style.display = 'none';
	document.body.style.overflow = 'auto';
}

function toggleFavorite(postId, event) {
	event.stopPropagation(); // 防止觸發卡片的 openModal
	const index = favorites.indexOf(postId);

	if (index > -1) {
		favorites.splice(index, 1); // 移除收藏
	} else {
		favorites.push(postId); // 加入收藏
	}

	localStorage.setItem('novel_favs', JSON.stringify(favorites));
	updateDisplay(); // 重新整理畫面顯示星星狀態
}
function toggleFavFilter() {
	showOnlyFavs = !showOnlyFavs;
	const btn = document.getElementById('favToggle');
	btn.classList.toggle('active');
	btn.innerText = showOnlyFavs ? '⭐ 顯示全部' : '⭐ 收藏';
	currentPage = 1;
	updateDisplay();
}
window.onload = loadData;