function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function clearAllCookies() {
    if (confirm('Вы уверены, что хотите очистить все сохраненные данные?')) {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
        location.reload();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    initializeVisitTracking();
    loadSavedTheme();
    loadSavedCalculation();
    initializeScrollTracking();
    initializeTypingEffect();
    emailjs.init("5_SwWTlM9l1VkFfY9");
    
    // Инициализация анимаций
    initAnimations();
});

// ===== ОТСЛЕЖИВАНИЕ ПОСЕЩЕНИЙ =====
function initializeVisitTracking() {
    let visitCount = parseInt(getCookie('visitCount')) || 0;
    let lastVisit = getCookie('lastVisit') || 'Впервые';
    
    visitCount++;
    const currentTime = new Date().toLocaleString('ru-RU');
    
    setCookie('visitCount', visitCount);
    setCookie('lastVisit', currentTime);
    
    document.getElementById('visit-count').textContent = visitCount;
    document.getElementById('last-visit').textContent = lastVisit;
}

// ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        themeToggle.textContent = '🌙';
        setCookie('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
        setCookie('theme', 'dark');
    }
}

function loadSavedTheme() {
    const savedTheme = getCookie('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-toggle').textContent = '☀️';
    }
}

// ===== КАЛЬКУЛЯТОР СТОИМОСТИ =====
function calculateTotal() {
    const checkboxes = document.querySelectorAll('.calc-checkbox:checked');
    let total = 0;
    
    checkboxes.forEach(checkbox => {
        total += parseInt(checkbox.dataset.price);
    });
    
    document.getElementById('calc-result').textContent = 
        `Общая стоимость: ${total.toLocaleString('ru-RU')} ₽`;
    
    // Сохраняем выбор в cookies
    const selectedServices = Array.from(checkboxes).map(cb => cb.dataset.price);
    setCookie('selectedServices', JSON.stringify(selectedServices));
    setCookie('calculatedTotal', total);
}

function resetCalculator() {
    document.querySelectorAll('.calc-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    calculateTotal();
}

function saveCalculation() {
    const totalStr = getCookie('calculatedTotal');
    const total = parseInt(totalStr || '0');
    const saveMessage = document.getElementById('save-message');

    if (total > 0) {
        // Показать сообщение
        saveMessage.textContent = `✅ Расчет успешно сохранен! Общая стоимость: ${total.toLocaleString('ru-RU')} ₽`;
        saveMessage.style.display = 'block';

        // Скрыть через 5 секунд
        setTimeout(() => {
            saveMessage.style.display = 'none';
        }, 5000);
    } else {
        saveMessage.textContent = '❌ Выберите услуги для расчета стоимости';
        saveMessage.style.display = 'block';
        setTimeout(() => {
            saveMessage.style.display = 'none';
        }, 5000);
    }
}

function loadSavedCalculation() {
    const savedServices = getCookie('selectedServices');
    if (savedServices) {
        try {
            const services = JSON.parse(savedServices);
            services.forEach(price => {
                const checkbox = document.querySelector(`[data-price="${price}"]`);
                if (checkbox) checkbox.checked = true;
            });
            calculateTotal();
        } catch (e) {
            console.log('Ошибка загрузки сохраненного расчета');
        }
    }
}

// ===== УВЕЛИЧЕНИЕ ИЗОБРАЖЕНИЙ =====
function zoomImage(img) {
    const overlay = document.getElementById('zoom-overlay');
    
    if (img.classList.contains('zoomed')) {
        closeZoom();
    } else {
        img.classList.add('zoomed');
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Сохраняем информацию о просмотре изображения
        setCookie('lastImageView', new Date().toISOString());
    }
}

function closeZoom() {
    const zoomedImg = document.querySelector('.zoomed');
    const overlay = document.getElementById('zoom-overlay');
    
    if (zoomedImg) {
        zoomedImg.classList.remove('zoomed');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeZoom();
    }
});

// ===== ОТСЛЕЖИВАНИЕ СКРОЛЛА =====
function initializeScrollTracking() {
    const scrollProgress = document.getElementById('scroll-progress');
    const currentSectionSpan = document.getElementById('current-section');
    
    window.addEventListener('scroll', function() {
        // Прогресс скролла
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        scrollProgress.style.width = scrollPercent + '%';
        
        // Определение текущей секции
        const sections = document.querySelectorAll('section[id]');
        let currentSection = 'Главная';
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                currentSection = section.getAttribute('id');
                // Переводим названия секций
                switch(currentSection) {
                    case 'home': currentSection = 'Главная'; break;
                    case 'services': currentSection = 'Услуги'; break;
                    case 'calculator': currentSection = 'Калькулятор'; break;
                    case 'about': currentSection = 'О программе'; break;
                    case 'contact': currentSection = 'Контакты'; break;
                }
            }
        });
        
        currentSectionSpan.textContent = currentSection;
        
        // Сохраняем позицию скролла
        setCookie('scrollPosition', scrollTop);
        setCookie('currentSection', currentSection);
    });
    
    // Восстанавливаем позицию скролла
    const savedScrollPosition = getCookie('scrollPosition');
    if (savedScrollPosition && savedScrollPosition > 100) {
        setTimeout(() => {
            window.scrollTo({
                top: parseInt(savedScrollPosition),
                behavior: 'smooth'
            });
        }, 1000);
    }
}

// ===== ЭФФЕКТ ПЕЧАТИ =====
function initializeTypingEffect() {
    const typingElement = document.querySelector('.typing-effect');
    if (typingElement && !getCookie('typingShown')) {
        setCookie('typingShown', 'true');
        // Эффект уже применен через CSS
    }
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====

function sendEmail(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const form = document.getElementById('contact-form');

    // Скрыть сообщения перед новой отправкой
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // Показать индикатор загрузки
    submitBtn.disabled = true;
    btnText.textContent = 'Отправляется...';

    // Данные для отправки
    const templateParams = {
        from_name: document.getElementById('name').value,
        from_email: document.getElementById('email').value,
        message: document.getElementById('message').value,
        to_email: 'vlad.konon2005@mail.ru'
    };

    emailjs.send('service_loiix7s', 'template_mzp8t71', templateParams)
        .then(function(response) {
            successMessage.style.display = 'block';
            successMessage.textContent = 'Сообщение успешно отправлено!';
            form.reset();
            submitBtn.disabled = false;
            btnText.textContent = 'Отправить письмо';
        }, function(error) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Ошибка при отправке сообщения: ' + (error.text || error);
            submitBtn.disabled = false;
            btnText.textContent = 'Отправить письмо';
        });
}



// ===== АНИМАЦИИ ПОЯВЛЕНИЯ =====
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
}

// ===== ПЛАВНАЯ ПРОКРУТКА =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Сохраняем последний клик по навигации
            setCookie('lastNavClick', this.getAttribute('href'));
        }
    });
});

// ===== ВАЛИДАЦИЯ ФОРМЫ =====
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    function validateField(field, condition) {
        const isValid = condition();
        if (!isValid && field.value.length > 0) {
            field.style.borderColor = '#dc3545';
        } else if (isValid) {
            field.style.borderColor = '#28a745';
        } else {
            field.style.borderColor = '#ddd';
        }
        return isValid;
    }

    if (nameInput) nameInput.addEventListener('input', function() {
        validateField(this, () => this.value.length >= 2);
    });

    if (emailInput) emailInput.addEventListener('input', function() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        validateField(this, () => emailRegex.test(this.value));
    });

    if (messageInput) messageInput.addEventListener('input', function() {
        validateField(this, () => this.value.length >= 10);
    });
});

// === Менеджер задач (динамический базовый URL) ===

function loadTasks() {
  fetch('/api/tasks')
    .then(res => res.json())
    .then(tasks => {
      const list = document.getElementById('task-list');
      list.innerHTML = '';
      tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.content;
        li.className = 'tdItem';
        li.dataset.id = task.id;
        list.appendChild(li);
      });
    })
    .catch(err => console.error('Ошибка загрузки задач:', err));
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('task-input');
  const list  = document.getElementById('task-list');

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const content = input.value.trim();
      if (!content) return;
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      .then(() => { input.value = ''; loadTasks(); })
      .catch(err => console.error('Ошибка добавления задачи:', err));
    }
  });

  list.addEventListener('click', e => {
    if (e.target.classList.contains('tdItem')) {
      const id = e.target.dataset.id;
      fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        .then(() => loadTasks())
        .catch(err => console.error('Ошибка удаления задачи:', err));
    }
  });

  loadTasks();
});

