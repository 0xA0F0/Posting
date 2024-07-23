import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, get, push, set, update, remove } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import Vue from "https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.esm.browser.min.js";
import confetti from 'https://cdn.skypack.dev/canvas-confetti';

const firebaseConfig = {
  apiKey: "AIzaSyDFLbXFdvOnuqmBQbaLlQl5H-T4wdjHTvM",
  authDomain: "vxwvxwvxwvxwvxwvxw.firebaseapp.com",
  databaseURL: "https://vxwvxwvxwvxwvxwvxw-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vxwvxwvxwvxwvxwvxw",
  storageBucket: "vxwvxwvxwvxwvxwvxw.appspot.com",
  messagingSenderId: "634499836834",
  appId: "1:634499836834:web:bd382166da1ddaf707a0fb",
  measurementId: "G-74DV8QY73V"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
new Vue({
  el: '#main',
  data() {
    return {
      password: '',
      passwordVisible: false,
      isLoggedIn: false,
      link: '',
      description: '',
      message: { type: '', text: '' },
      linksData: [],
      editMode: false,
      editLinkId: null,
      editLink: '',
      editDescription: '',
      searchQuery: '',
      audioPool: [],
      isOk: false,
      isShow: false,
      poolSize: 5,
      currentIndex: 0
    };
  },
  created() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      this.isLoggedIn = true;
    }
    this.loadLinks();
    this.initializeAudioPool();
  },
  computed: {
    filteredLinks() {
      const query = this.searchQuery.toLowerCase();
      if (!query) {
        return this.linksData;
      }
      return this.linksData
        .map(linkItem => {
          const linkText = linkItem.link.toLowerCase();
          const descriptionText = linkItem.description.toLowerCase();
          let relevance = 0;
          if (linkText === query || descriptionText === query) {
            relevance = 3;
          } else if (linkText.startsWith(query) || descriptionText.startsWith(query)) {
            relevance = 2;
          } else if (linkText.includes(query) || descriptionText.includes(query)) {
            relevance = 1;
          }
          return { ...linkItem, relevance };
        })
        .filter(linkItem => linkItem.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance);
    }
  },
  methods: {
    handleEnter() {
      this.playAudio();
      this.login();
    },
    loadLinks() {
      const linksRef = ref(db, 'links');
      get(linksRef).then((snapshot) => {
        this.linksData = [];
        snapshot.forEach((childSnapshot) => {
          const linkData = {
            id: childSnapshot.key,
            link: childSnapshot.val().link,
            description: childSnapshot.val().description
          };
          this.linksData.unshift(linkData);
        });
      }).catch((error) => {
        console.error('Ошибка при загрузке данных:', error);
        this.showMessage('error', 'Ошибка при загрузке данных');
      });
    },
    submitData() {
      if (!this.link.trim()) {
        this.showMessage('error', 'Введите ссылку');
        return;
      }
      if (!this.description.trim()) {
        this.showMessage('error', 'Введите описание');
        return;
      }

      const linksRef = ref(db, 'links');
      if (this.editMode) {
        this.showMessage('error', 'Невозможно отправить запостить в режиме редактирования');
      } else {
        const newData = {
          link: this.link,
          description: this.description
        };
        const newLinkRef = push(linksRef);
        set(newLinkRef, newData).then(() => {
          console.log('Добавлено');
          this.showMessage('success', 'Добавлено');
          this.link = '';
          this.description = '';
          this.linksData.unshift({ id: newLinkRef.key, ...newData });
          this.launchConfetti(); 
        }).catch((error) => {
          console.error('Ошибка при добавлении:', error);
          this.showMessage('error', 'Ошибка при добавлении');
        });
      }
    },
    deleteLink(linkId) {
      const linkRef = ref(db, `links/${linkId}`);
      remove(linkRef)
        .then(() => {
          console.log('Удалено');
          this.showMessage('success', 'Удалено');
          this.linksData = this.linksData.filter(link => link.id !== linkId);
        })
        .catch((error) => {
          console.error('Ошибка удаления:', error);
          this.showMessage('error', 'Ошибка удаления');
        });
    },
    saveEditedLink(linkId) {
      const linkRef = ref(db, `links/${linkId}`);
      const newData = {
        link: this.editLink,
        description: this.editDescription
      };
      update(linkRef, newData).then(() => {
        console.log('Обновлено');
        this.showMessage('success', 'Обновлено');
        this.cancelEdit();
        const linkIndex = this.linksData.findIndex(link => link.id === linkId);
        if (linkIndex !== -1) {
          this.$set(this.linksData, linkIndex, { ...newData, id: linkId });
        }
      }).catch((error) => {
        console.error('Ошибка при обновлении данных:', error);
        this.showMessage('error', 'Ошибка при обновлении данных');
      });
    },
    cancelEdit() {
      this.editMode = false;
      this.editLinkId = null;
      this.editLink = '';
      this.editDescription = '';
    },
    editLinkData(linkId, link, description) {
      this.editMode = true;
      this.editLinkId = linkId;
      this.editLink = link;
      this.editDescription = description;
    },
    login() {
      const passwordRef = ref(db, 'password');
      get(passwordRef).then((snapshot) => {
        const passwordFromDatabase = snapshot.val();
        if (this.password === passwordFromDatabase) {
          this.isLoggedIn = true;
          localStorage.setItem('isLoggedIn', 'true');
          this.showMessage('success', 'Ты в системе');
        } else {
          this.showMessage('error', 'Неверный пароль');
        }
      }).catch((error) => {
        console.error(error);
      });
    },
    logout() {
      localStorage.removeItem('isLoggedIn');
      this.isLoggedIn = false;
      this.showMessage('success', 'Вышел из системы');
    },
    showMessage(type, text) {
      this.message.type = type;
      this.message.text = text;
      setTimeout(() => {
        this.removeMessage();
      }, 3000);
    },
    removeMessage() {
      this.message.type = '';
      this.message.text = '';
    },
    on(event) {
      const element = event.currentTarget;
      element.classList.toggle('allowed');
    },
    none(event) {
      const element = event.currentTarget;
      this.isOk = true;
      element.classList.add('ok');
    },
    show(event) {
      const element = event.currentTarget;
      this.isShow = true;
      element.classList.add('showed');
    },
    removeOk() {
      this.isOk = false;
      const element = document.querySelector('.none');
      if (element) {
        element.classList.remove('ok');
      }
      this.searchQuery = ''; 
    },
    togglePasswordVisibility() {
      this.passwordVisible = !this.passwordVisible;
      const passwordField = document.getElementById('password-field');
      const toggleButton = document.getElementById('toggle-password');
      if (this.passwordVisible) {
        passwordField.type = 'text';
        toggleButton.classList.remove('mdi-eye-closed');
        toggleButton.classList.add('mdi-eye-outline');
      } else {
        passwordField.type = 'password';
        toggleButton.classList.remove('mdi-eye-outline');
        toggleButton.classList.add('mdi-eye-closed');
      }
    },
    initializeAudioPool() {
      this.audioPool = Array.from({ length: this.poolSize }, () => new Audio('files/audio/press.mp3'));
    },
    playAudio() {
      const audio = this.audioPool[this.currentIndex];
      audio.currentTime = 0;
      audio.play();
      this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    },
    handleInput(event) {
      const key = event.data;
      if (key) {
        this.playAudio();
      }
    },
    launchConfetti() {
      const confettiEl = document.querySelector('.send');
      if (confettiEl) {
        const { left, top, width, height } = confettiEl.getBoundingClientRect();
        const x = (left + width / 2) / window.innerWidth;
        const y = (top + height / 2) / window.innerHeight;

        confetti({
          particleCount: 100,
          spread: 70, 
          startVelocity: 30,
          angle: -270, 
          origin: { x, y },
          disableForReducedMotion: true
        });
      }
    }
  }
});

