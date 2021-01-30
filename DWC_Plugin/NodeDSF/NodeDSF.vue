<style scoped>

	.primary-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.full-screen {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		z-index: 10;
	}

	.settings-container {
		position: absolute;
		opacity: 1;
		top: 0;
		right: 0;
		width: 60%;
		height: 50px;
	}

	.settings-button {
		opacity: 0.3;
		position:relative;
		float: right;
		right:10px;
		top:0px;
		transition: 0.5s;
		color: #818181;
		cursor: pointer;
	}
	.settings-button {
		opacity: 1;
	}

	.url-container {
		opacity: 1;
		position:relative;
		float: right;
		width: 70%;
		display: none;
		background-color: var(--dark);
		top: 1px;
		height: 38px;
	}

	.btn-container {
		opacity: 1;
		position:relative;
		width: 100%;
		display: block;
		top: 1px;
	}
	
	.settings-urlinput {
		top: 5px;
		position:relative;
		width: 20%;
		border: 1px solid #818181;
		background-color: var(--dark);
		color: #818181;		
	}

	.settings-label {
		color: #818181;
		top:5px;
		position:relative;
	}

</style>

<template>
    <div id="primarycontainer" ref="primarycontainer" class="primary-container mt-2" v-resize="resize">
        <div id="settings-container" class="settings-container">
			<div id="urlContainer" class="url-container">
				<label id="labelSafeURL" class="settings-label">NodeDSF URL: </label>
				<input id="NodeDSF_URL" type="text" value="" class="settings-urlinput">
				<v-btn @click="urlSave" id= "settings-urlsave" class="settings-button">Save</v-btn>
				<v-btn @click="urlCancel" id= "settings-urlcancel" class="settings-button">Cancel</v-btn>
			</div>
			<div id="BtnContainer" class="btn-container">
				<v-btn @click="showSettings" id="settings-button" class="settings-button">Settings</v-btn>
			</div>
		</div>
		<iframe class="NodeIFrame" id="NodeIFrame" ref="NodeIFrame" src ="" scrolling="no" frameborder="0" allowtransparency="true" width=auto height=auto></iframe>
    </div>
</template>

<script>
'use strict';

let viewer = {};

export default {
	
	data: function () {
		return {
			NodeDSF_URL: ''
		};
	},
	
	mounted() {
		//watch for resizing events
		window.addEventListener('resize', () => {
			this.$nextTick(() => {
				this.resize();
			});
		});
		this.loadSettings();
		let safeurl = "http://" + window.location.hostname + ":1880/";
		document.getElementById('NodeIFrame').src = safeurl + document.getElementById('NodeDSF_URL').value;
		viewer.resize();
	},

	methods: {
		resize() {
			let safeurl = "http://" + window.location.hostname + ":1880/";
			document.getElementById("labelSafeURL").innerText = "NodeDSF URL: " + safeurl;
			let contentArea = getComputedStyle(document.getElementsByClassName('v-toolbar__content')[0]);
			let globalContainer = getComputedStyle(document.getElementById('global-container'));
			let primaryContainer = getComputedStyle(this.$refs.primarycontainer);
			let contentAreaHeight = parseInt(contentArea.height) + parseInt(contentArea.paddingTop) + parseInt(contentArea.paddingBottom);
			let globalContainerHeight = parseInt(globalContainer.height) + parseInt(globalContainer.paddingTop) + parseInt(globalContainer.paddingBottom);
			this.$refs.primarycontainer.style.height = window.innerHeight - contentAreaHeight - globalContainerHeight - parseInt(primaryContainer.marginTop) + 'px';
			this.$refs.NodeIFrame.style.height = window.innerHeight - contentAreaHeight - globalContainerHeight - parseInt(primaryContainer.marginTop) + 'px';
			this.$refs.NodeIFrame.style.width = "100%";
			if (Object.keys(viewer).length !== 0) {
				viewer.resize();
			}
		},
		urlSave() {
			document.getElementById("urlContainer").style.display = "none";
			document.getElementById("settings-button").style.display = "block";
			this.saveSettings();
			this.loadsettings();
			viewer.resize();
		},
		urlCancel() {
			document.getElementById("urlContainer").style.display = "none";
			document.getElementById("settings-button").style.display = "block";
		},
		showSettings() {
			document.getElementById("urlContainer").style.display = "block";
			document.getElementById("settings-button").style.display = "none";
		},
		loadSettings() {
			//Check for saved settings
			let urlString = localStorage.getItem('NodeDSFsettings');
			if (urlString) {
				document.getElementById('NodeDSF_URL').value = JSON.parse(urlString);
				//document.getElementById('NodeDSF_URL').value = JSON.parse(urlString);
			} else {
				document.getElementById('NodeDSF_URL').value = '';
			}
		},
		saveSettings() {
			let safeurl = "http://" + window.location.hostname + ":1880/";
			localStorage.setItem('NodeDSFsettings', JSON.stringify(document.getElementById('NodeDSF_URL').value));
			document.getElementById('NodeIFrame').src = safeurl + document.getElementById('NodeDSF_URL').value;
			viewer.resize();
		},
	},
	activated() {
		this.resize();
	},
	deactivated() {
		this.resize();
	},
};
</script>
