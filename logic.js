//Map from shortcuts to url
let shortcuts = {};
let jump_to_tab = true;
//Map from url to Title
let urlToTitle = {};
//Table HTML Element
var table = elementById("sc_table");
//Map for all delete listeners so that we can delete these listeners when When we delete the row
var listenersList = new Map();
//Legacy:To check if current window is a Popup
isPopup = false;

//---------------utils
function getDeleteButtonId(id) {
	return `delete#${id}`;
}

function getRowId(id) {
	return `row#${id}`;
}

//call "fn()" when Doucument is loaded
function OnDocLoad(fn) {
	if (document.readyState != 'loading') {
		fn();
	}
	else {
		document.addEventListener('DOMContentLoaded', fn)
	}
}

// Function to download data to a file
function download(data, filename, type) {
	var file = new Blob([data], { type: type });
	if (window.navigator.msSaveOrOpenBlob) // IE10+
		window.navigator.msSaveOrOpenBlob(file, filename);
	else { // Others
		var a = document.createElement("a"),
			url = URL.createObjectURL(file);
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(function () {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 0);
	}
}

function elementById(id) {
	return document.getElementById(id);
}

//Reformat URL
function getDisplayTextFromURL(url) {
	let disp = url;
	disp = disp.replace(/(^\w+:|^)\/\//, '');
	if (disp[disp.length - 1] == "/") {
		disp = disp.slice(0, -1);
	}
	base = disp.split("/")[0];
	if (urlToTitle[url] == null)
		return disp;

	return base + " > " + urlToTitle[url];
}
//----------------Communication

//Reload Table
function reload() {
	refresh();
	refresh_jump_to_tab();
	deleteTable();
	createTable();
}

//Download ShortCuts as JSON
function downloadShortcuts() {
	var json_string = JSON.stringify(shortcuts);
	download(json_string, "shortcuts.json", "json");
}

//Refresh Data in storage and in the RT Database
function refresh() {
	//Send message to background to update data
	chrome.runtime.sendMessage({
		command: "load",
		data: shortcuts
	});
	save();
}

function refresh_jump_to_tab() {
	//Send message to background to update jump_to_tab_state
	chrome.runtime.sendMessage({
		command: "load_jump_to_tab",
		data: jump_to_tab
	});
	save();
}

//Saving Data Into Storage
function save() {
	chrome.storage.sync.set({ shortcuts, urlToTitle, jump_to_tab });
}

//Loading Data from storage
function load(callback) {
	chrome.storage.sync.get(['shortcuts', 'urlToTitle', 'jump_to_tab'], (data) => {

		if (data.shortcuts)
			shortcuts = data.shortcuts;
		if (data.urlToTitle)
			urlToTitle = data.urlToTitle;
		if (data.jump_to_tab !== null)
			jump_to_tab = data.jump_to_tab;
		callback();
	});
}


//Adding Events on button
function addAddListener() {
	OnDocLoad(() => {
		var add_button = elementById('add');
		var shortcut_input = elementById('shortcut');
		var url_input = elementById('url');
		var settings_button = elementById('settings');
		var clear_button = elementById('clear');
		var export_button = elementById("export");
		var import_button = elementById("import");
		var jump_to_tab_checkbox = elementById("jump_to_tab");

		jump_to_tab_checkbox.checked = jump_to_tab;

		//Legacy:Dont show setting button if its a popup
		if (!isPopup) {
			settings_button.style.visibility = "hidden";
		}
		else {
			settings_button.addEventListener('click', () => {
				chrome.tabs.create({ url: "logic.html" });
				window.close();
			});
		}

		jump_to_tab_checkbox.addEventListener("change", function () {
			jump_to_tab = jump_to_tab_checkbox.checked;
			refresh_jump_to_tab();
			save();
		});

		//Clear All Button
		clear_button.addEventListener('click', function () {
			if (window.confirm("Confirm Clear All")) {
				if (window.confirm("Export as JSON")) {
					downloadShortcuts();
				}
				shortcuts = {};
				shortcut_input.value = "";
				url_input.value = "";
				reload();
				shortcut_input.focus();
			}
		});

		//Download/Export Shortcuts
		export_button.addEventListener('click', function () {
			downloadShortcuts();
		});

		//Import Shortcuts
		import_button.addEventListener('change', function () {
			const files = this.files;
			if (files[0]) {
				try {
					const file = files[0];
					var reader = new FileReader();
					reader.readAsText(file, "UTF-8");
					reader.onload = function (evt) {
						try {
							shortcuts = JSON.parse(evt.target.result);
							reload();
							import_button.value = "";
						}
						catch (e) {
							alert("File Cannot be Parsed");
						}
					}
				} catch (e) {
					alert("File Cannot be Read");
				}
				reader.onerror = function (evt) {
					alert("File Cannot be Read");
				}
			}
		});

		//Add Shortcut Button
		add_button.addEventListener('click', function () {
			var key = shortcut_input.value;
			var value = url_input.value;
			addShortcut(key, value);
		});

		//Add Shortcuts Text Fields
		[shortcut_input, url_input].forEach((input_element) => {
			input_element.addEventListener("keyup", function (event) {
				//Call add when "Enter/Return" is pressed
				if (event.key === 'Enter') {
					// Cancel the default action, if needed
					event.preventDefault();
					// Trigger the button element with a click
					add_button.click();
				}
			});
		});

		const settingsButton = document.querySelector(".settings-btn");
		const menuButtons = document.querySelectorAll(".menu-btn");
		const settingsContainer = document.querySelector(".settings-container");
		function toggleMenu() {
			menuButtons.forEach((btn, index) => {
				setTimeout(() => {
					btn.classList.toggle("show");
				}, index * 100);
			});
		}

		function closeMenu(event) {
			if (!settingsContainer.contains(event.target)) {
				menuButtons.forEach((btn, index) => {
					setTimeout(() => {
						btn.classList.remove("show");
					}, index * 100);
				});
			}
		}

		settingsButton.addEventListener("click", toggleMenu);

		document.addEventListener("click", closeMenu);
	});
}


//--------------Short Cuts Operations
//Delete Table Content
function deleteTable() {
	for (const [key, value] of listenersList.entries()) {
		var link = elementById(getDeleteButtonId(key));
		link.removeEventListener('click', value);
	}
	listenersList.clear();
	table.innerHTML = "";
}

//Element Attributes setter
function setAttributes(el, attrs) {
	for (var key in attrs) {
		el.setAttribute(key, attrs[key]);
	}
}

//Add row to Table
function addRow(key, value) {

	//Creating Data Row
	let tr = document.createElement('tr');
	setAttributes(tr, { 'id': getRowId(key) });

	//Delete Button
	let td1 = document.createElement('td');
	setAttributes(td1,
		{ 'align': 'center' });
	let input = document.createElement('input');
	setAttributes(input, {
		'type': 'image',
		'alt': 'x',
		'src': 'icons/close.png',
		'class': 'icon_style',
		'id': getDeleteButtonId(key)
	});
	td1.appendChild(input);
	//Adding Delete Button listener
	var listener = function () {
		deleteShortcut(key, true);
	};
	input.addEventListener('click', listener);
	listenersList.set(key, listener);
	tr.appendChild(td1);

	//Shortcut Text
	let td2 = document.createElement('td');
	setAttributes(td2, {
		'class': 'text_display',
	});
	td2.appendChild(document.createTextNode(key));
	tr.append(td2);

	//URL Text
	let td3 = document.createElement('td');
	setAttributes(td3, {
		'class': 'text_display',
	});
	let a = document.createElement("a");
	setAttributes(a, {
		'href': value,
		'target': '_blank'
	})
	a.appendChild(document.createTextNode(getDisplayTextFromURL(value)))
	td3.appendChild(a);
	tr.append(td3);

	table.appendChild(tr);
}

//Create Table
function createTable() {
	deleteTable();
	for (const [key, value] of Object.entries(shortcuts)) {
		addRow(key, value);
	}
}

//Add new shortcut to database
//doRefresh: Do you want to refresh Storage when adding
function addShortcut(key, value, doRefresh = true) {
	key = key.trim();
	if (shortcuts[key] != null)
		deleteShortcut(key, false);
	if (!value.includes("://")) {
		if (!value.startsWith("www.")) {
			value = "www." + value;
		}
		value = "https://" + value;
	}

	shortcuts[key] = value;
	addRow(key, value);
	if (doRefresh)
		refresh();
}

//Deleteing a shortcut
//doRefresh: Do you want to refresh Storage when adding
function deleteShortcut(key, doRefresh = true) {
	delete shortcuts[key];
	var row = elementById(getRowId(key));
	var link = elementById(getDeleteButtonId(key));
	link.removeEventListener('click', listenersList[key]);
	listenersList.delete(key);
	row.remove();
	if (doRefresh)
		refresh();
}

//-------------Default Calls
function loadURL() {
	//Get Page info of the page for which we want the shortcut
	OnDocLoad(() => {
		chrome.runtime.sendMessage({ command: "get_page_info" }, (pageinfo) => {
			addAddListener();
			elementById('url').value = pageinfo.url;
			urlToTitle[pageinfo.url] = pageinfo.title;
		});
	});
}

function init() {
	try {
		load(createTable);
		loadURL();
	}
	catch (e) {
		console.error(e)
	}
}
init();

//Getting Page Data from background.js 
chrome.runtime.onMessage.addListener((message) => {
	switch (message.command) {
		case ("reload_URL"):
			loadURL();
			break;
	}
});
