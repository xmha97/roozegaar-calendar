/*
 * Copyright (c) 2025 Mehdi Dimyadi (https://github.com/MEHDIMYADI)
 * Project: Roozegaar Calendar (https://roozegaar.ir/)
 *
 * If you use or get inspiration from this project,
 * please kindly mention my name or this project in your work.
 * It took a lot of effort to build, and I’d really appreciate your acknowledgment.
 *
 * Licensed under no specific open-source license — all rights reserved unless stated otherwise.
 */

// ======================= APPLICATION INITIALIZATION =======================
/**
 * Main application initialization
 */
function initializeApp() {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 App initialization started...');
        
        try {
            // Load cities data first with error handling
            console.log('🏙️ Loading cities data...');
            await loadCitiesData();
            
            // Initialize components
            console.log('📦 Loading components...');
            await loadAllComponents();
            
            // Wait a bit more for DOM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize state
            currentLang = localStorage.getItem('lang') || 'fa';
            currentCalendar = localStorage.getItem('calendarType') || 'persian';
            
            // Hide API events section if disabled
            if (!showApiEvents) {
                if (apiEventsSection) {
                    apiEventsSection.style.display = 'none';
                }
                console.log('🔕 API events are disabled - skipping API requests');
            } else {
                console.log('🔔 API events are enabled');
            }
            
            // Load language and setup
            console.log('🌐 Loading language...');
            await loadLanguage(currentLang);
            document.body.setAttribute('data-calendar', currentCalendar);
            
            // Initialize theme (updated)
            console.log('🎨 Initializing theme...');
            initializeTheme();
            
            // Restore calendar state
            if (currentCalendar === 'persian') {
                currentPersianDate = gregorianToPersian(currentDate);
            } else {
                currentDate = persianToGregorian(currentPersianDate);
            }
            
            // Setup all functionality
            console.log('⚙️ Setting up functionality...');
            setupEventListeners();
            initializePWA();
            registerServiceWorker();
            initializeSettingsModal();
            setupSettingsHandlers();

            // Initialize calendar
            console.log('📅 Initializing calendar...');
            initCalendar();
            
            // Show today's events
            const todayKey = currentCalendar === 'persian' 
                ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
                : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());

            dailyEventsCard(todayKey);
            
            // Update sun times display
            updateSunTimesDisplay();
            
            // Update API events section visibility
            updateApiEventsSectionVisibility();
            
            // Initialize API events ONLY if enabled
            if (showApiEvents) {
                console.log('📅 Loading API events...');
                await loadApiEvents();
            } else {
                console.log('⏭️ Skipping API events loading - disabled in settings');
            }
            
            // Hide PWA prompt if in standalone mode
            if (window.matchMedia('(display-mode: standalone').matches) {
                if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
            }
            
            // Initialize mobile menu
            new MobileMenu();
                        
            console.log('✅ App initialized successfully!');
                        
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    });
    
    // handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page) {
            navigateTo(event.state.page);
        }
    });    
}

// ======================= BASE URL CONFIG =======================
const BASE_PATH = `${window.location.origin}/calendar`;

// ======================= STATE MANAGEMENT =======================
let events = JSON.parse(localStorage.getItem('calendarEvents')) || {};
let apiEvents = JSON.parse(localStorage.getItem('apiCalendarEvents')) || {};
let currentCalendar = localStorage.getItem('calendarType') || 'persian';
let currentDate = new Date();
let currentPersianDate = gregorianToPersian(currentDate);
let currentLang = localStorage.getItem('lang') || 'fa';
let showSecondaryCalendar = localStorage.getItem('showSecondaryCalendar') !== 'false';
let showApiEvents = localStorage.getItem('showApiEvents') !== 'false';
let apiEventsCalendar = localStorage.getItem('apiEventsCalendar') || 'both';
let activeApiEventsTab = localStorage.getItem('activeApiEventsTab') || 'main';
let showDailyEvents = localStorage.getItem('showDailyEvents') !== 'false';
let langData = {};
let deferredPrompt;
const longPressDuration = 500;
let selectedDayElement = null;
let currentPage = 'calendar'; 
let eventsToShow = null;
let cities = {};
let currentCity = localStorage.getItem('selectedCity') || 'tehran';
let defaultFooterExpanded = true;
let Tab = 'main';

// ======================= DOM ELEMENTS =======================
let persianDay, persianMonth, persianFullDate;
let gregorianDay, gregorianMonth, gregorianFullDate;
let dailyEventsContainer;
let apiEventsSection, apiEventsToggle, apiEventsCalendarSelect, dailyEventsToggle;
let footerToggle, footerContainer;

let themeToggle, langToggle, mobileMenuBtn, navMenu;
let prevYearBtn, prevMonthBtn, todayBtn, nextMonthBtn, nextYearBtn;
let currentMonthYear, weekdays, daysGrid;
let eventModal, closeModal, eventForm;
let eventTitleLabel, eventDateLabel, eventDate, eventDescriptionLabel, eventDescription;
let submitEvent, cancelEvent, eventsList, modalTitle;
let settingsModal, closeSettingsModal, calendarTypeSelect;
let themeToggleSettings, langToggleSettings, themeSelect, langSelect, secondaryCalendarToggle;
let pwaInstallPrompt, pwaPromptTitle, pwaPromptSubtitle, pwaDismissBtn, pwaInstallBtn;

// ======================= Components =======================
async function loadAllComponents() {
	const components = [];

	if (document.getElementById('header'))
		components.push({ id: 'header', url: `${BASE_PATH}/assets/components/header.html` });
		
	if (document.getElementById('main-content')) {
      if (currentPage === 'calendar') {
          components.push({ id: 'main-content', url: `${BASE_PATH}/assets/components/calendar.html` });
      } else if (currentPage === 'settings') {
          components.push({ id: 'main-content', url: `${BASE_PATH}/assets/components/settings.html` });
      } else if (currentPage === 'privacy-policy') {
          components.push({ id: 'main-content', url: `${BASE_PATH}/assets/components/privacy-policy.html` });
      }
  }
  
	if (document.getElementById('footer')) 
		components.push({ id: 'footer', url: `${BASE_PATH}/assets/components/footer.html` });
	
	for (const c of components) {
		await loadComponent(c.id, c.url);
    }
    
    // After all components are loaded, initialize DOM elements
    initializeDOMElements();
    
    initializeFooterToggle();    
}

function loadComponent(id, url) {
    return fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Failed to load component: ${url}, status: ${res.status}`);
            }
            return res.text();
        })
        .then(html => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = html;
                console.log(`✅ Component ${id} loaded successfully`);
                return true;
            } else {
                console.error(`❌ Element with id ${id} not found`);
                return false;
            }
        })
        .catch(error => {
            console.error(`❌ Error loading component ${id}:`, error);
            return false;
        });
}

// ======================= THEME MANAGEMENT =======================
/**
 * Initializes theme based on system preference and saved settings
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
        console.log('Theme select:', savedTheme);

    // If the value is invalid, set the default
    if (!['default', 'light', 'dark'].includes(savedTheme)) {
        localStorage.setItem('theme', 'default');
    }
    
    // Apply saved theme
    applyTheme(savedTheme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
        const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        systemThemeMedia.addEventListener('change', handleSystemThemeChange);
        
        // Check once at the beginning
        handleSystemThemeChange(systemThemeMedia);        
    }
}

/**
 * Applies theme to the document
 * @param {string} theme - Theme name ('default', 'light', 'dark')
 */
function applyTheme(theme) {
    console.log('Applying theme:', theme);
    
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-mode');
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-default');
    
    if (theme === 'default') {
        const systemTheme = getSystemTheme();
        document.documentElement.setAttribute('data-theme', systemTheme);
        document.documentElement.setAttribute('data-theme-mode', 'auto');
        document.documentElement.classList.add('theme-default');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme-mode', 'manual');
        document.documentElement.classList.add(`theme-${theme}`);
    }
}

/**
 * Gets system theme preference
 * @returns {string} System theme ('light' or 'dark')
 */
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Handles system theme changes
 * @param {MediaQueryListEvent} e - Media query event
 */
function handleSystemThemeChange(e) {
    const currentTheme = localStorage.getItem('theme') || 'default';
    
    // Only update if theme is set to 'default'
    if (currentTheme === 'default') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
    }
}

/**
 * Updates theme select appearance
 * @param {string} theme - Current theme
 */
function updateThemeSelect(theme) {
    if (!themeSelect) {
        console.warn('Theme select element not found');
        themeSelect = document.getElementById('themeSelect');
        if (!themeSelect) return;
    }
    
    themeSelect.value = theme;
    
    const options = themeSelect.querySelectorAll('option');
    options.forEach(option => {
        const value = option.value;
        if (value === 'default') {
            option.textContent = langData.ui.themeDefault || 'پیش‌فرض سیستم';
        } else if (value === 'light') {
            option.textContent = langData.ui.light || 'روشن';
        } else if (value === 'dark') {
            option.textContent = langData.ui.dark || 'تیره';
        }
    });
}

/**
 * Toggles between themes
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'default';
    let newTheme;
    
    // Cycle through themes: default -> light -> dark -> default
    if (currentTheme === 'default') {
        newTheme = 'light';
    } else if (currentTheme === 'light') {
        newTheme = 'dark';
    } else {
        newTheme = 'default';
    }
    
    // Apply new theme and save
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Show feedback
    showThemeChangeToast(newTheme);
}

/**
 * Shows toast notification for theme change
 * @param {string} theme - New theme name
 */
function showThemeChangeToast(theme) {
    let message;
    
    if (theme === 'default') {
        message = langData.ui.themeSetToDefault || 'تم روی پیش‌فرض سیستم تنظیم شد';
    } else if (theme === 'light') {
        message = langData.ui.themeSetToLight || 'تم روشن فعال شد';
    } else {
        message = langData.ui.themeSetToDark || 'تم تاریک فعال شد';
    }
    
    showToast(message);
}

/**
 * Handles theme change from settings dropdown
 */
function handleThemeChange() {
    const theme = themeSelect.value;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    showThemeChangeToast(theme);
}

// ======================= PAGE NAVIGATION =======================
/**
 * Navigates between pages
 * @param {string} page - Page name ('calendar', 'settings')
 */
async function navigateTo(page) {
    console.log(`🔄 Navigating to: ${page}`);
    
    if (currentPage === page) {
        const mobileMenu = new MobileMenu();
        if (mobileMenu.isOpen) {
            mobileMenu.closeMenu();
        }
        return;
    }
    
    window.history.pushState({ page }, '', `#${page}`);
    currentPage = page;
    
    try {
        let componentUrl;
        let pageTitle = '';
        
        if (page === 'calendar') {
            componentUrl = `${BASE_PATH}/assets/components/calendar.html`;
            pageTitle = langData.ui.calendar || 'گاه‌شمار';
        } else if (page === 'settings') {
            componentUrl = `${BASE_PATH}/assets/components/settings.html`;
            pageTitle = langData.ui.settings || 'تنظیمات';
        } else if (page === 'privacy-policy') {
            componentUrl = `${BASE_PATH}/assets/components/privacy-policy.html`;
            pageTitle = langData.ui.privacyPolicy || 'حریم خصوصی';
        } else if (page === 'terms') {
            componentUrl = `${BASE_PATH}/assets/components/terms.html`;
            pageTitle = langData.ui.termsConditions || 'قوانین و مقررات';
        } else if (page === 'faq') {
            componentUrl = `${BASE_PATH}/assets/components/faq.html`;
            pageTitle = langData.ui.faq || 'سوالات متداول';
        } else if (page === 'about') {
            componentUrl = `${BASE_PATH}/assets/components/about.html`;
            pageTitle = langData.ui.about || 'درباره';
        }

        if (componentUrl) {
            await loadComponent('main-content', componentUrl);
            initializeDOMElements();
            
            // Update logo with current page title
            updateLogoWithPageTitle(pageTitle);
            
            if (page === 'calendar') {
                setupCalendarNavigation();
                initCalendar();
                
                // Update API events section visibility based on current settings
                updateApiEventsSectionVisibility();
                
                // Show today's events
                const todayKey = currentCalendar === 'persian' 
                    ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
                    : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
                dailyEventsCard(todayKey);
                
                updateSunTimesDisplay();
                
                // Load API events only if enabled
                if (showApiEvents) {
                    console.log('📅 Loading API events...');
                    await loadApiEvents();
                } else {
                    console.log('⏭️ Skipping API events loading - disabled in settings');
                }      
            } else if (page === 'settings') {
                setupSettingsPage();
            } else if (page === 'privacy-policy') {
                setupPrivacyPolicyPage();
            } else if (page === 'terms') {
                setupTermsPage();
            } else if (page === 'faq') {
                setupFAQPage();
            } else if (page === 'about') {
                setupAboutPage();
            }
            
            updateActiveNav();
            
            console.log(`✅ Successfully navigated to ${page}`);
        }
    } catch (error) {
        console.error(`❌ Error navigating to ${page}:`, error);
    }
}

/**
 * Sets up settings page functionality
 */
function setupSettingsPage() {
    console.log('⚙️ Setting up settings page...');
    
    // Ensure proper initialization from localStorage
    showApiEvents = localStorage.getItem('showApiEvents') !== 'false';
    apiEventsCalendar = localStorage.getItem('apiEventsCalendar') || 'both';
    showDailyEvents = localStorage.getItem('showDailyEvents') !== 'false';
    
    console.log('Settings loaded - Show API Events:', showApiEvents);
    console.log('Settings loaded - API Events Calendar:', apiEventsCalendar);
    
    if (themeSelect) themeSelect.value = localStorage.getItem('theme') || 'default';
    if (langSelect) langSelect.value = currentLang;
    if (calendarTypeSelect) calendarTypeSelect.value = currentCalendar;
    if (secondaryCalendarToggle) secondaryCalendarToggle.checked = showSecondaryCalendar;
    
    // Initialize city selection
    const citySelect = document.getElementById('citySelect');
    if (citySelect) {
        initializeCitySelection();
        
        // Set current city if available
        if (cities[currentCity]) {
            citySelect.value = currentCity;
        }
        
        // Add event listener for city changes
        citySelect.addEventListener('change', function() {
            const city = this.value;
            localStorage.setItem('selectedCity', city);
            currentCity = city;
            updateSunTimesDisplay();
            showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
        });
    } else {
        console.warn('⚠️ City select element not found during settings setup');
    }
    
    // Ensure API events settings are properly set
    if (apiEventsToggle) {
        apiEventsToggle.checked = showApiEvents;
        console.log('API Events Toggle set to:', apiEventsToggle.checked);
    }
    
    if (apiEventsCalendarSelect) {
        apiEventsCalendarSelect.value = apiEventsCalendar;
        console.log('API Events Calendar Select set to:', apiEventsCalendarSelect.value);
    }

    // Event listeners
    themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        const savedTheme = localStorage.getItem('theme') || 'default';
        themeSelect.value = savedTheme;
        updateThemeSelect(savedTheme);
        themeSelect.addEventListener('change', handleThemeChange);
    }
    if (langSelect) {
        langSelect.addEventListener('change', handleLanguageChange);
    }
    if (calendarTypeSelect) {
        calendarTypeSelect.addEventListener('change', handleCalendarTypeChange);
    }
    if (secondaryCalendarToggle) {
        secondaryCalendarToggle.addEventListener('change', handleSecondaryCalendarToggle);
    }
    if (apiEventsToggle) {
        apiEventsToggle.addEventListener('change', handleApiEventsToggle);
    }
    if (apiEventsCalendarSelect) {
        apiEventsCalendarSelect.addEventListener('change', handleApiEventsCalendarChange);
    }  
    if (dailyEventsToggle) {
        dailyEventsToggle.checked = showDailyEvents;
        dailyEventsToggle.addEventListener('change', handleDailyEventsToggle);
    }    
    
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    updateSettingsText();
    
}

/**
 * Sets up privacy policy page functionality
 */
function setupPrivacyPolicyPage() {
    console.log('🔒 Setting up privacy policy page...');
    
    const privacyContent = document.querySelector('.privacy-content');
    if (!privacyContent) {
        console.error('❌ Privacy content container not found');
        return;
    }
    
    // Clear existing content
    privacyContent.innerHTML = '';
    
    // Get privacy data from language file
    const privacyData = langData.privacy;
    
    // Create main container
    const privacyContainer = document.createElement('div');
    privacyContainer.className = 'privacy-container';
    
    // Create title
    const title = document.createElement('h1');
    title.className = 'privacy-title';
    title.textContent = privacyData.title;
    privacyContainer.appendChild(title);
    
    // Create sections
    if (privacyData.sections && Array.isArray(privacyData.sections)) {
        privacyData.sections.forEach((section, index) => {
            const sectionElement = createPrivacySection(section, index);
            privacyContainer.appendChild(sectionElement);
        });
    }
        
    privacyContent.appendChild(privacyContainer);
    
}


/**
 * Creates a privacy policy section
 * @param {Object} section - Section data from language file
 * @param {number} index - Section index
 * @returns {HTMLElement} Section element
 */
function createPrivacySection(section, index) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'privacy-section';
    sectionElement.setAttribute('role', 'region');
    sectionElement.setAttribute('aria-labelledby', `section-title-${index}`);
    
    const title = document.createElement('h2');
    title.id = `section-title-${index}`;
    title.className = 'privacy-section-title';
    title.textContent = section.title;
    
    const content = document.createElement('p');
    content.className = 'privacy-section-content';
    content.textContent = section.content;
    
    sectionElement.appendChild(title);
    sectionElement.appendChild(content);
    
    return sectionElement;
}

/**
 * Sets up terms page functionality
 */
function setupTermsPage() {
    console.log('🔒 Setting up terms page...');
    
    const termsContent = document.querySelector('.terms-content');
    if (!termsContent) {
        console.error('❌ Terms content container not found');
        return;
    }
    
    // Clear existing content
    termsContent.innerHTML = '';
    
    // Get terms data from language file
    const termsData = langData.terms;
    
    // Create main container
    const termsContainer = document.createElement('div');
    termsContainer.className = 'terms-container';
    
    // Create title
    const title = document.createElement('h1');
    title.className = 'terms-title';
    title.textContent = termsData.title;
    termsContainer.appendChild(title);
    
    // Create sections
    if (termsData.sections && Array.isArray(termsData.sections)) {
        termsData.sections.forEach((section, index) => {
            const sectionElement = createTermsSection(section, index);
            termsContainer.appendChild(sectionElement);
        });
    }
        
    termsContent.appendChild(termsContainer);
    
}

/**
 * Creates a terms section
 * @param {Object} section - Section data from language file
 * @param {number} index - Section index
 * @returns {HTMLElement} Section element
 */
function createTermsSection(section, index) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'terms-section';
    sectionElement.setAttribute('role', 'region');
    sectionElement.setAttribute('aria-labelledby', `section-title-${index}`);
    
    const title = document.createElement('h2');
    title.id = `section-title-${index}`;
    title.className = 'terms-section-title';
    title.textContent = section.title;
    
    const content = document.createElement('p');
    content.className = 'terms-section-content';
    content.textContent = section.content;
    
    sectionElement.appendChild(title);
    sectionElement.appendChild(content);
    
    return sectionElement;
}

// ======================= FAQ FUNCTIONALITY =======================

/**
 * Sets up FAQ page functionality
 */
function setupFAQPage() {
    console.log('❓ Setting up FAQ page...');
    
    const faqContent = document.querySelector('.faq-page');
    if (!faqContent) {
        console.error('❌ FAQ content container not found');
        return;
    }
    
    // Load FAQ data and render
    loadFaqData();
    
    // Setup search functionality
    setupFaqSearch();
    
    // Setup category and question toggles
    setupFaqToggles();
}

/**
 * Loads FAQ data from language file and renders it
 */
function loadFaqData() {
    const faqData = langData.faq;
    if (!faqData) {
        console.error('❌ FAQ data not found in language file');
        return;
    }
    
    renderFaqCategories(faqData.categories);
}

/**
 * Renders FAQ categories and questions
 * @param {Object} categories - FAQ categories data
 */
function renderFaqCategories(categories) {
    const categoriesContainer = document.getElementById('faqCategories');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = '';
    
    Object.keys(categories).forEach(categoryKey => {
        const category = categories[categoryKey];
        const categoryElement = createCategoryElement(categoryKey, category);
        categoriesContainer.appendChild(categoryElement);
    });
}

/**
 * Creates a FAQ category element
 * @param {string} categoryKey - Category key
 * @param {Object} category - Category data
 * @returns {HTMLElement} Category element
 */
function createCategoryElement(categoryKey, category) {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'faq-category';
    categoryElement.setAttribute('data-category', categoryKey);
    
    // Category header
    const header = document.createElement('div');
    header.className = 'faq-category-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', `category-${categoryKey}`);
    
    const title = document.createElement('h3');
    title.className = 'faq-category-title';
    title.textContent = category.title;
    
    const toggle = document.createElement('button');
    toggle.className = 'faq-category-toggle';
    toggle.setAttribute('aria-label', `${category.title} ${currentLang === 'fa' ? 'را باز کن' : 'expand'}`);
    toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    header.appendChild(title);
    header.appendChild(toggle);
    
    // Category content
    const content = document.createElement('div');
    content.className = 'faq-category-content';
    content.id = `category-${categoryKey}`;
    
    if (category.questions && Array.isArray(category.questions)) {
        category.questions.forEach((question, index) => {
            const questionElement = createQuestionElement(question, index);
            content.appendChild(questionElement);
        });
    }
    
    categoryElement.appendChild(header);
    categoryElement.appendChild(content);
    
    // Add event listener for accessibility
    header.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
    });
    
    return categoryElement;
}

/**
 * Creates a FAQ question element
 * @param {Object} question - Question data
 * @param {number} index - Question index
 * @returns {HTMLElement} Question element
 */
function createQuestionElement(question, index) {
    const questionElement = document.createElement('div');
    questionElement.className = 'faq-question';
    questionElement.setAttribute('role', 'article');
    
    const questionHeader = document.createElement('div');
    questionHeader.className = 'faq-question-header';
    questionHeader.setAttribute('role', 'button');
    questionHeader.setAttribute('tabindex', '0');
    questionHeader.setAttribute('aria-expanded', 'false');
    questionHeader.setAttribute('aria-controls', `answer-${index}`);
    
    const questionText = document.createElement('div');
    questionText.className = 'faq-question-text';
    questionText.textContent = question.question;
    
    const questionToggle = document.createElement('button');
    questionToggle.className = 'faq-question-toggle';
    questionToggle.setAttribute('aria-label', currentLang === 'fa' ? 'نمایش پاسخ' : 'Show answer');
    questionToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    questionHeader.appendChild(questionText);
    questionHeader.appendChild(questionToggle);
    
    const answer = document.createElement('div');
    answer.className = 'faq-answer';
    answer.id = `answer-${index}`;
    answer.setAttribute('role', 'region');
    answer.textContent = question.answer;
    
    questionElement.appendChild(questionHeader);
    questionElement.appendChild(answer);
    
    // Add event listener for accessibility
    questionHeader.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
    });
    
    return questionElement;
}

/**
 * Sets up FAQ search functionality
 */
function setupFaqSearch() {
    const searchInput = document.getElementById('faqSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(handleFaqSearch, 300));
}

/**
 * Handles FAQ search
 * @param {Event} e - Input event
 */
function handleFaqSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    if (searchTerm.length === 0) {
        resetFaqSearch();
        return;
    }
    
    performFaqSearch(searchTerm);
}

/**
 * Performs FAQ search and highlights results
 * @param {string} searchTerm - Search term
 */
function performFaqSearch(searchTerm) {
    const questions = document.querySelectorAll('.faq-question');
    let foundResults = false;
    
    questions.forEach(question => {
        const questionText = question.querySelector('.faq-question-text').textContent.toLowerCase();
        const answerText = question.querySelector('.faq-answer').textContent.toLowerCase();
        
        const matchesQuestion = questionText.includes(searchTerm);
        const matchesAnswer = answerText.includes(searchTerm);
        
        if (matchesQuestion || matchesAnswer) {
            question.style.display = 'block';
            foundResults = true;
            
            // Highlight matching text
            highlightSearchTerm(question, searchTerm);
            
            // Expand parent category
            const category = question.closest('.faq-category');
            const categoryContent = category.querySelector('.faq-category-content');
            categoryContent.classList.add('expanded');
        } else {
            question.style.display = 'none';
        }
    });
    
    showNoResults(!foundResults);
}

/**
 * Highlights search term in FAQ content
 * @param {HTMLElement} question - Question element
 * @param {string} searchTerm - Search term
 */
function highlightSearchTerm(question, searchTerm) {
    const questionText = question.querySelector('.faq-question-text');
    const answerText = question.querySelector('.faq-answer');
    
    const highlightText = (element, term) => {
        const text = element.textContent;
        const regex = new RegExp(`(${term})`, 'gi');
        const highlighted = text.replace(regex, '<span class="search-highlight">$1</span>');
        element.innerHTML = highlighted;
    };
    
    highlightText(questionText, searchTerm);
    highlightText(answerText, searchTerm);
}

/**
 * Resets FAQ search state
 */
function resetFaqSearch() {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(question => {
        question.style.display = 'block';
        
        // Remove highlighting
        const questionText = question.querySelector('.faq-question-text');
        const answerText = question.querySelector('.faq-answer');
        
        questionText.innerHTML = questionText.textContent;
        answerText.innerHTML = answerText.textContent;
    });
    
    showNoResults(false);
}

/**
 * Shows/hides no results message
 * @param {boolean} show - Whether to show the message
 */
function showNoResults(show) {
    let noResults = document.querySelector('.faq-no-results');
    
    if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'faq-no-results';
        noResults.textContent = langData.faq?.noResults || 'نتیجه‌ای یافت نشد';
        
        const categoriesContainer = document.getElementById('faqCategories');
        if (categoriesContainer) {
            categoriesContainer.appendChild(noResults);
        }
    }
    
    noResults.classList.toggle('show', show);
}

/**
 * Sets up FAQ toggle functionality
 */
function setupFaqToggles() {
    // Use event delegation for all FAQ interactions
    document.addEventListener('click', (e) => {
        // Category toggle
        if (e.target.closest('.faq-category-toggle')) {
            e.preventDefault();
            const toggle = e.target.closest('.faq-category-toggle');
            const category = toggle.closest('.faq-category');
            const content = category.querySelector('.faq-category-content');
            const icon = toggle.querySelector('i');
            
            // Toggle category
            toggle.classList.toggle('rotated');
            content.classList.toggle('expanded');
            
            // Update icon
            if (content.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
        
        // Question toggle
        if (e.target.closest('.faq-question-toggle')) {
            e.preventDefault();
            const toggle = e.target.closest('.faq-question-toggle');
            const question = toggle.closest('.faq-question');
            const answer = question.querySelector('.faq-answer');
            const icon = toggle.querySelector('i');
            
            // Toggle question
            toggle.classList.toggle('rotated');
            answer.classList.toggle('expanded');
            
            // Update icon
            if (answer.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
        
        // Question header click (alternative to toggle button)
        if (e.target.closest('.faq-question-header') && !e.target.closest('.faq-question-toggle')) {
            e.preventDefault();
            const header = e.target.closest('.faq-question-header');
            const question = header.closest('.faq-question');
            const answer = question.querySelector('.faq-answer');
            const toggle = question.querySelector('.faq-question-toggle');
            const icon = toggle.querySelector('i');
            
            // Toggle question
            toggle.classList.toggle('rotated');
            answer.classList.toggle('expanded');
            
            // Update icon
            if (answer.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
    });

    // Add keyboard support for accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if (e.target.closest('.faq-question-header') || e.target.closest('.faq-category-header')) {
                e.preventDefault();
                e.target.click();
            }
        }
    });
}
        
/**
 * Debounce function for search
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ======================= ABOUT FUNCTIONALITY =======================
        
/**
 * Sets up about page functionality
 */
function setupAboutPage() {
    console.log('👤 Setting up about page...');
    
    const aboutContent = document.querySelector('.about-content');
    if (!aboutContent) {
        console.error('❌ About content container not found');
        return;
    }
    
    // Clear existing content
    aboutContent.innerHTML = '';
    
    // Get about data from language file
    const aboutData = langData.about;
    
    // Create main container
    const aboutContainer = document.createElement('div');
    aboutContainer.className = 'about-container';
    
    // Create hero section
    const heroSection = createAboutHero(aboutData);
    aboutContainer.appendChild(heroSection);
    
    // Create about me section
    const aboutMeSection = createAboutSection(
        aboutData.sections.aboutMe.title,
        aboutData.sections.aboutMe.content
    );
    aboutContainer.appendChild(aboutMeSection);
    
    // Create projects section
    const projectsSection = createProjectsSection(aboutData);
    aboutContainer.appendChild(projectsSection);
    
    // Create skills section
    const skillsSection = createSkillsSection(aboutData);
    aboutContainer.appendChild(skillsSection);
    
    // Create contact section
    const contactSection = createContactSection(aboutData);
    aboutContainer.appendChild(contactSection);
    
    aboutContent.appendChild(aboutContainer);
}

/**
 * Creates about hero section
 */
function createAboutHero(aboutData) {
    const hero = document.createElement('div');
    hero.className = 'about-hero';
    
        // Get about data from language file
    const uiData = langData.ui;
    
    const title = document.createElement('h1');
    title.className = 'about-hero-title';
    title.textContent = uiData.logo;
    
    const subtitle = document.createElement('p');
    subtitle.className = 'about-hero-subtitle';
    subtitle.textContent = uiData.slogan;
    
    const profile = document.createElement('div');
    profile.className = 'about-profile';
    
    // Avatar (you can add your image later)
    const avatar = document.createElement('div');
    avatar.className = 'about-avatar';
    avatar.style.backgroundColor = 'rgba(255,255,255,0.2)';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.innerHTML = '<i class="fas fa-user" style="font-size: 3rem; color: white;"></i>';
    
    const profileInfo = document.createElement('div');
    profileInfo.className = 'about-profile-info';
    
    const profileName = document.createElement('div');
    profileName.className = 'about-profile-name';
    profileName.textContent = aboutData.hero.title;
    
    const profileRole = document.createElement('div');
    profileRole.className = 'about-profile-role';
    profileRole.textContent = aboutData.hero.subtitle;
    
    const socialLinks = document.createElement('div');
    socialLinks.className = 'about-social-links';
    
    // GitHub link
    const githubLink = document.createElement('a');
    githubLink.className = 'about-social-link';
    githubLink.href = 'https://github.com/MEHDIMYADI';
    githubLink.target = '_blank';
    githubLink.innerHTML = '<i class="fab fa-github"></i>';
    githubLink.title = aboutData.links.github;
    
    // Website link
    const websiteLink = document.createElement('a');
    websiteLink.className = 'about-social-link';
    websiteLink.href = 'https://dimyadi.ir/';
    websiteLink.target = '_blank';
    websiteLink.innerHTML = '<i class="fas fa-globe"></i>';
    websiteLink.title = aboutData.links.website;
    
    // Roozegaar link
    const roozegaarLink = document.createElement('a');
    roozegaarLink.className = 'about-social-link';
    roozegaarLink.href = 'https://roozegaar.ir/';
    roozegaarLink.target = '_blank';
    roozegaarLink.innerHTML = '<i class="fas fa-calendar"></i>';
    roozegaarLink.title = aboutData.links.roozegaar;
    
    socialLinks.appendChild(githubLink);
    socialLinks.appendChild(websiteLink);
    socialLinks.appendChild(roozegaarLink);
    
    profileInfo.appendChild(profileName);
    profileInfo.appendChild(profileRole);
    profileInfo.appendChild(socialLinks);
    
    profile.appendChild(avatar);
    profile.appendChild(profileInfo);
    
    hero.appendChild(title);
    hero.appendChild(subtitle);
    hero.appendChild(profile);
    
    return hero;
}

/**
 * Creates a generic about section
 */
function createAboutSection(title, content) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = content;
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    
    return section;
}

/**
 * Creates projects section
 */
function createProjectsSection(aboutData) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = aboutData.sections.projects.title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = aboutData.sections.projects.content;
    
    const projectsGrid = document.createElement('div');
    projectsGrid.className = 'about-projects';
    
    aboutData.projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'about-project-card';
        
        const projectTitle = document.createElement('h3');
        projectTitle.className = 'about-project-title';
        projectTitle.textContent = project.title;
        
        const projectDesc = document.createElement('p');
        projectDesc.className = 'about-project-description';
        projectDesc.textContent = project.description;
        
        const projectLink = document.createElement('a');
        projectLink.className = 'about-project-link';
        projectLink.href = project.url;
        projectLink.target = '_blank';
        projectLink.innerHTML = '<i class="fas fa-external-link-alt"></i> ' + (currentLang === 'fa' ? 'مشاهده پروژه' : 'View Project');
        
        projectCard.appendChild(projectTitle);
        projectCard.appendChild(projectDesc);
        projectCard.appendChild(projectLink);
        projectsGrid.appendChild(projectCard);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    section.appendChild(projectsGrid);
    
    return section;
}

/**
 * Creates skills section
 */
function createSkillsSection(aboutData) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = aboutData.sections.skills.title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = aboutData.sections.skills.content;
    
    const skillsContainer = document.createElement('div');
    skillsContainer.className = 'about-skills';
    
    aboutData.skills.forEach(skill => {
        const skillElement = document.createElement('span');
        skillElement.className = 'about-skill';
        skillElement.textContent = skill;
        skillsContainer.appendChild(skillElement);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    section.appendChild(skillsContainer);
    
    return section;
}

/**
 * Creates contact section
 */
function createContactSection(aboutData) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = aboutData.sections.contact.title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = aboutData.sections.contact.content;
    
    const contactInfo = document.createElement('div');
    contactInfo.className = 'about-social-links';
    contactInfo.style.marginTop = '1rem';
    
    // Email contact
    const emailLink = document.createElement('a');
    emailLink.className = 'about-social-link';
    emailLink.href = 'mailto:mahdi2006d@gmail.com';
    emailLink.innerHTML = '<i class="fas fa-envelope"></i>';
    emailLink.title = 'Email';
    
    // GitHub contact
    const githubContact = document.createElement('a');
    githubContact.className = 'about-social-link';
    githubContact.href = 'https://github.com/MEHDIMYADI';
    githubContact.target = '_blank';
    githubContact.innerHTML = '<i class="fab fa-github"></i>';
    githubContact.title = 'GitHub';
    
    contactInfo.appendChild(emailLink);
    contactInfo.appendChild(githubContact);
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    section.appendChild(contactInfo);
    
    return section;
}
    
/**
 * Resets all settings to default
 */
function resetSettings() {
    if (confirm(langData.ui.resetConfirm || 'آیا از بازنشانی همه تنظیمات اطمینان دارید؟')) {
        localStorage.removeItem('theme');
        localStorage.removeItem('lang');
        localStorage.removeItem('calendarType');
        localStorage.removeItem('showSecondaryCalendar');
        localStorage.removeItem('showApiEvents');
        localStorage.removeItem('apiEventsCalendar');
        localStorage.removeItem('activeApiEventsTab');
        localStorage.removeItem('showDailyEvents');        
        localStorage.removeItem('calendarEvents');
        localStorage.setItem('selectedCity', 'tehran');

        currentLang = 'fa';
        currentCalendar = 'persian';
        localStorage.setItem('showSecondaryCalendar', 'true');
        localStorage.setItem('showApiEvents', 'false');
        localStorage.setItem('showDailyEvents', 'false');        
        apiEventsCalendar = 'both';
        activeApiEventsTab = 'main';
        currentCity = 'tehran';
        events = {};
        
        if (themeSelect) themeSelect.value = 'default';
        if (apiEventsToggle) apiEventsToggle.checked = false;
        if (dailyEventsToggle) dailyEventsToggle.checked = false;
        
        // Update API events section visibility immediately
        updateApiEventsSectionVisibility();
        
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.setAttribute('lang', 'fa');
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.setAttribute('data-calendar', 'persian');
        
        location.reload();
    }
}

/**
 * Updates active navigation state
 */
function updateActiveNav() {
    const navItems = document.querySelectorAll('#navMenu li');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    let activeIndex = 0;
    if (currentPage === 'settings') {
        activeIndex = 1;
    }
    
    if (navItems[activeIndex]) {
        navItems[activeIndex].classList.add('active');
    }
}

/**
 * Initialize all DOM elements after components are loaded
 */
function initializeDOMElements() {
    // Calendar navigation elements
    themeToggle = document.getElementById('themeToggle');
    langToggle = document.getElementById('langToggle');
    mobileMenuBtn = document.getElementById('mobileMenuBtn');
    navMenu = document.getElementById('navMenu');
    prevYearBtn = document.getElementById('prevYear');
    prevMonthBtn = document.getElementById('prevMonth');
    todayBtn = document.getElementById('todayBtn');
    nextMonthBtn = document.getElementById('nextMonth');
    nextYearBtn = document.getElementById('nextYear');
    currentMonthYear = document.getElementById('currentMonthYear');
    weekdays = document.getElementById('weekdays');
    daysGrid = document.getElementById('daysGrid');
    
    // Modal elements
    eventModal = document.getElementById('eventModal');
    closeModal = document.getElementById('closeModal');
    eventForm = document.getElementById('eventForm');
    eventTitleLabel = document.getElementById('eventTitleLabel');
    eventDateLabel = document.getElementById('eventDateLabel');
    eventDate = document.getElementById('eventDate');
    eventDescriptionLabel = document.getElementById('eventDescriptionLabel'); 
    eventDescription = document.getElementById('eventDescription');
    submitEvent = document.getElementById('submitEvent');
    cancelEvent = document.getElementById('cancelEvent');
    eventsList = document.getElementById('eventsList');
    modalTitle = document.getElementById('modalTitle');
    
    // Settings modal elements
    settingsModal = document.getElementById('settingsModal');
    closeSettingsModal = document.getElementById('closeSettingsModal');
    calendarTypeSelect = document.getElementById('calendarTypeSelect');
    themeToggleSettings = document.getElementById('themeToggleSettings');
    langToggleSettings = document.getElementById('langToggleSettings');
    themeSelect = document.getElementById('themeSelect');
    langSelect = document.getElementById('langSelect');
    secondaryCalendarToggle = document.getElementById('secondaryCalendarToggle');
    
    // PWA elements
    pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
    pwaPromptTitle = document.getElementById('pwaPromptTitle');
    pwaPromptSubtitle = document.getElementById('pwaPromptSubtitle');
    pwaDismissBtn = document.getElementById('pwaDismissBtn');
    pwaInstallBtn = document.getElementById('pwaInstallBtn');
    
    // Calendar card elements
    persianDay = document.getElementById('persianDay');
    persianMonth = document.getElementById('persianMonth');
    persianFullDate = document.getElementById('persianFullDate');
    gregorianDay = document.getElementById('gregorianDay');
    gregorianMonth = document.getElementById('gregorianMonth');
    gregorianFullDate = document.getElementById('gregorianFullDate');
    dailyEventsContainer = document.getElementById('dailyEventsContainer');
    
    // Calendar API elements
    apiEventsSection = document.getElementById('apiEvents');    
    apiEventsToggle = document.getElementById('apiEventsToggle');
    apiEventsCalendarSelect = document.getElementById('apiEventsCalendarSelect');
    dailyEventsToggle = document.getElementById('dailyEventsToggle');

    footerToggle = document.getElementById('footerToggle');
    footerContainer = document.getElementById('footerContainer');
    
    // Log initialization status
    console.log('DOM elements initialized:', {
        currentMonthYear: !!currentMonthYear,
        daysGrid: !!daysGrid,
        weekdays: !!weekdays,
        eventModal: !!eventModal,
        settingsModal: !!settingsModal
    });
}

// ======================= EVENT LISTENERS SETUP =======================
/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    setupNavigation();
    setupCalendarNavigation();
    setupEventModal();
    setupThemeAndLanguageToggles();
}

/**
 * Sets up navigation between pages
 */
function setupNavigation() {
    document.addEventListener('click', (e) => {
        const navLink = e.target.closest('#navMenu a');
        if (navLink) {
            e.preventDefault();
            
            const linkText = navLink.textContent.toLowerCase();
            if (linkText.includes('calendar') || linkText.includes('گاه‌شمار')) {
                navigateTo('calendar');
            } else if (linkText.includes('settings') || linkText.includes('تنظیمات')) {
                navigateTo('settings');
            }
            
            // Menu will be closed automatically by the MobileMenu class
        }
        
        const footerLink = e.target.closest('.footer-links a, .moreInfoLinks a');
        if (footerLink) {
            e.preventDefault();
            const linkHref = footerLink.getAttribute('href');
            const linkText = footerLink.textContent.toLowerCase();
            
            // Detect link type (internal or external)
            if (linkHref && (linkHref.startsWith('http') || linkHref.startsWith('//'))) {
                // External link - open in browser
                openExternalLink(linkHref);
            } else {
                // Internal link
                if (linkText.includes('privacy') || linkText.includes('حریم')) {
                    navigateTo('privacy-policy');
                } else if (linkText.includes('terms') || linkText.includes('conditions') || linkText.includes('قوانین') || linkText.includes('مقررات')) {
                    navigateTo('terms');
                } else if (linkText.includes('questions') || linkText.includes('faq') || linkText.includes('سوالات') || linkText.includes('متداول')) {
                    navigateTo('faq');
                } else if (linkText.includes('about') || linkText.includes('درباره')) {
                    navigateTo('about');
                }
                
                // Scroll to top
                scrollToTop();
            }
        }
    });
}

/**
 * Sets up calendar navigation controls
 */
function setupCalendarNavigation() {
    prevYearBtn.addEventListener('click', () => navigateCalendar('prevYear'));
    prevMonthBtn.addEventListener('click', () => navigateCalendar('prevMonth'));
    todayBtn.addEventListener('click', () => navigateCalendar('today'));
    nextMonthBtn.addEventListener('click', () => navigateCalendar('nextMonth'));
    nextYearBtn.addEventListener('click', () => navigateCalendar('nextYear'));
}

/**
 * Sets up event modal functionality
 */
function setupEventModal() {
    closeModal.addEventListener('click', closeEventModal);
    cancelEvent.addEventListener('click', closeEventModal);
    eventForm.addEventListener('submit', saveEvent);
    
    eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });
}

/**
 * Sets up theme and language toggle buttons
 */
function setupThemeAndLanguageToggles() {
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (langToggle) langToggle.addEventListener('click', toggleLanguage);
}

// ======================= MOBILE MENU =======================
/**
 * Mobile menu functionality
 */
class MobileMenu {
    constructor() {
        this.menuBtn = document.getElementById('mobileMenuBtn');
        this.navMenu = document.querySelector('nav');
        this.navOverlay = document.getElementById('navOverlay');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        this.menuBtn.addEventListener('click', () => this.toggleMenu());
        if (this.navOverlay) {
            this.navOverlay.addEventListener('click', () => this.closeMenu());
        }
        
        // Close menu when clicking on nav links
        this.setupNavLinks();

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
        
        // Close menu on resize to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });
    }
    
    setupNavLinks() {
        const navLinks = this.navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenuWithAnimation();
                // Scroll to top
                scrollToTop();
            });
        });
    }    
    
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.navMenu.classList.add('active');
        if (this.navOverlay) this.navOverlay.classList.add('active');
        this.menuBtn.setAttribute('aria-expanded', 'true');
        this.menuBtn.innerHTML = '<i class="fas fa-times"></i>';
        this.isOpen = true;
        
        // Trap focus inside menu
        this.trapFocus();
    }
    
    closeMenu() {
        this.navMenu.classList.remove('active');
        if (this.navOverlay) this.navOverlay.classList.remove('active');
        this.menuBtn.setAttribute('aria-expanded', 'false');
        this.menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        this.isOpen = false;
    }
    
    closeMenuWithAnimation() {
        // Add closing animation class
        this.navMenu.classList.add('closing');
        
        // Wait for animation to complete before fully closing
        setTimeout(() => {
            this.closeMenu();
            this.navMenu.classList.remove('closing');
        }, 300); // Match this with CSS transition duration
    }
    
    trapFocus() {
        const focusableElements = this.navMenu.querySelectorAll(
            'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

// ======================= CALENDAR CORE FUNCTIONS =======================
/**
 * Initializes calendar display
 */
function initCalendar() {
    restoreCalendarState();
    updateCalendarHeader();
    renderWeekdays();
    renderDays();
    calendarCards();
    highlightToday();
}

/**
 * Restores calendar state from localStorage
 */
function restoreCalendarState() {
    const savedCalendarType = localStorage.getItem('calendarType');
    if (savedCalendarType) {
        currentCalendar = savedCalendarType;
    }
    
    // Restore secondary calendar preference
    const savedSecondaryCalendar = localStorage.getItem('showSecondaryCalendar');
    if (savedSecondaryCalendar !== null) {
        showSecondaryCalendar = savedSecondaryCalendar === 'true';
    }
    
    if (currentCalendar === 'persian') {
        currentPersianDate = gregorianToPersian(currentDate);
    } else {
        currentDate = persianToGregorian(currentPersianDate);
    }
}

/**
 * Updates calendar header with current month and year
 */
function updateCalendarHeader() {
    if (!currentMonthYear) {
        console.warn('⚠️ currentMonthYear element not found, skipping update');
        return;
    }
    
    try {
        if (currentCalendar === 'persian') {
            const monthName = langData.months.fa[currentPersianDate.month - 1];
            const year = formatNumber(currentPersianDate.year, currentLang);
            currentMonthYear.textContent = `${monthName} ${year}`;
        } else {
            const monthName = langData.months.en[currentDate.getMonth()];
            const year = formatNumber(currentDate.getFullYear(), 'en');
            currentMonthYear.textContent = `${monthName} ${year}`;
        }
        console.log('✅ Calendar header updated successfully');
    } catch (error) {
        console.error('❌ Error updating calendar header:', error);
    }
}

/**
 * Renders weekday headers
 */
function renderWeekdays() {
    weekdays.innerHTML = '';
    const days = currentCalendar === 'persian' ? langData.weekdays.fa : langData.weekdays.en;

    days.forEach(d => {
        const div = document.createElement('div');
        div.classList.add('weekday-cell');
        div.textContent = d;
        weekdays.appendChild(div);
    });
}

// ======================= CALENDAR RENDERING =======================
/**
 * Renders calendar days grid
 */
function renderDays() {
    daysGrid.innerHTML = '';
    
    let firstDay, daysInMonth, currentMonth, currentYear;
    
    if (currentCalendar === 'persian') {
        currentMonth = currentPersianDate.month;
        currentYear = currentPersianDate.year;
        firstDay = getFirstDayOfPersianMonth(currentYear, currentMonth);
        daysInMonth = getDaysInPersianMonth(currentYear, currentMonth);
    } else {
        currentMonth = currentDate.getMonth();
        currentYear = currentDate.getFullYear();
        firstDay = new Date(currentYear, currentMonth, 1).getDay();
        daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    }
    
    renderEmptyDays(firstDay);
    renderMonthDays(currentYear, currentMonth, daysInMonth);
}

/**
 * Renders empty days at the start of the month
 * @param {number} count - Number of empty days to render
 */
function renderEmptyDays(count) {
    for (let i = 0; i < count; i++) {
        const emptyDay = document.createElement('div');
		emptyDay.classList.add('day', 'empty-day');        
        daysGrid.appendChild(emptyDay);
    }
}

/**
 * Renders days of the current month
 * @param {number} year - Current year
 * @param {number} month - Current month
 * @param {number} daysInMonth - Number of days in the month
 */
function renderMonthDays(year, month, daysInMonth) {
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(year, month, day);
        setupDayEventListeners(dayElement, year, month, day);
        daysGrid.appendChild(dayElement);
    }
}

/**
 * Creates a day element for the calendar grid
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 * @returns {HTMLElement} Day element
 */
function createDayElement(year, month, day) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('day');
    
    const dateKey = getDateKey(year, month, day);
    
    // Add has-event class if there is an event
    if (events[dateKey] && events[dateKey].length > 0) {
        dayElement.classList.add('has-event');
    }

    const primaryDate = document.createElement('div');
    primaryDate.classList.add('primary-date');
    
    // Format primary date based on current language
    if (currentCalendar === 'persian') {
        primaryDate.textContent = formatNumber(day, currentLang);
    } else {
        primaryDate.textContent = formatNumber(day, 'en'); // Always use English digits for Gregorian
    }
    
    dayElement.appendChild(primaryDate);

    // Only show secondary date if enabled
    if (showSecondaryCalendar) {
        const secondaryDate = document.createElement('div');
        secondaryDate.classList.add('secondary-date');
        
        if (currentCalendar === 'persian') {
            const gregDate = persianToGregorian({year: year, month: month, day});
            // For secondary Gregorian dates in Persian calendar, use English digits
            secondaryDate.textContent = formatNumber(gregDate.getDate(), 'en');
        } else {
            const persDate = gregorianToPersian(new Date(year, month, day));
            // For secondary Persian dates in Gregorian calendar, use Persian digits
            secondaryDate.textContent = formatNumber(persDate.day, 'fa');
        }
        dayElement.appendChild(secondaryDate);
    }

    addEventIndicator(dayElement, dateKey);

    return dayElement;
}

/**
 * Adds event indicator to day element if events exist
 * @param {HTMLElement} dayElement - Day element
 * @param {string} dateKey - Date key for events lookup
 */
function addEventIndicator(dayElement, dateKey) {
    if (events[dateKey] && events[dateKey].length > 0) {
        const indicator = document.createElement('div');
        indicator.classList.add('event-indicator');
        
        // Set color based on calendar type and theme
        const isDarkTheme = document.documentElement.hasAttribute('data-theme');
        
        if (currentCalendar === 'persian') {
            indicator.style.backgroundColor = isDarkTheme ? '#ff6b6b' : '#e74c3c';
        } else {
            indicator.style.backgroundColor = isDarkTheme ? '#3498db' : '#2980b9';
        }
        
        indicator.style.width = '6px';
        indicator.style.height = '6px';
        indicator.style.borderRadius = '50%';
        indicator.style.marginTop = '5px';
        indicator.style.zIndex = '2';
        
        dayElement.appendChild(indicator);
    }
}

/**
 * Sets up event listeners for day element
 * @param {HTMLElement} dayElement - Day element
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function setupDayEventListeners(dayElement, year, month, day) {
    // Prevent these listeners from applying to empty days
    if (dayElement.classList.contains('empty-day')) {
        return;
    }

    let longPressTimer;

    // Touch/click start function
    const startPress = (e) => {
      
        // Prevent default behavior on touch
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
        
        longPressTimer = setTimeout(() => {
            openEventModal(year, month, day);
        }, longPressDuration);
    };

    // End touch/click function
    const endPress = (e) => {
        clearTimeout(longPressTimer);
        
        // If the touch was short, act as a click
        if (e.type === 'touchend' || e.type === 'click') {
            const touch = e.type === 'touchend' ? e.changedTouches[0] : null;
            handleDayClick(dayElement, year, month, day, touch);
        }
    };
    
    // Cancel touch/click
    const cancelPress = () => {
        clearTimeout(longPressTimer);
    };

    // Add event listeners for mobile and desktop
    dayElement.addEventListener('touchstart', startPress, { passive: false });
    dayElement.addEventListener('touchend', endPress);
    dayElement.addEventListener('touchcancel', cancelPress);
    
    dayElement.addEventListener('mousedown', startPress);
    dayElement.addEventListener('mouseup', endPress);
    dayElement.addEventListener('mouseleave', cancelPress);
    dayElement.addEventListener('click', endPress);
}

// ======================= CALENDAR NAVIGATION =======================
/**
 * Navigates calendar based on direction
 * @param {string} direction - Navigation direction
 */
async function navigateCalendar(direction) {
    if (direction === 'today') {
        handleTodayButton();
        return;
    }
    
    if (currentCalendar === 'persian') {
        navigatePersianCalendar(direction);
    } else {
        navigateGregorianCalendar(direction);
    }
    
    updateCalendarHeader();
    renderDays();
    
    // Update calendar cards to keep them in sync
    calendarCards();
    
    // After calendar navigation
    await loadApiEvents();

    // Highlight today if we're in the current month
    setTimeout(() => {
        highlightToday();
    }, 100);
}

/**
 * Navigates Persian calendar
 * @param {string} direction - Navigation direction
 */
function navigatePersianCalendar(direction) {
    switch(direction) {
        case 'prevYear':
            currentPersianDate.year--;
            break;
        case 'prevMonth':
            currentPersianDate.month--;
            if (currentPersianDate.month < 1) {
                currentPersianDate.month = 12;
                currentPersianDate.year--;
            }
            break;
        case 'nextMonth':
            currentPersianDate.month++;
            if (currentPersianDate.month > 12) {
                currentPersianDate.month = 1;
                currentPersianDate.year++;
            }
            break;
        case 'nextYear':
            currentPersianDate.year++;
            break;
    }
    currentDate = persianToGregorian(currentPersianDate);
}

/**
 * Navigates Gregorian calendar
 * @param {string} direction - Navigation direction
 */
function navigateGregorianCalendar(direction) {
    switch(direction) {
        case 'prevYear':
            currentDate.setFullYear(currentDate.getFullYear() - 1);
            break;
        case 'prevMonth':
            currentDate.setMonth(currentDate.getMonth() - 1);
            break;
        case 'nextMonth':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        case 'nextYear':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
    }
    currentPersianDate = gregorianToPersian(currentDate);
}

/**
 * Handles today button click
 */
async function handleTodayButton() {
    const today = new Date();
    
    // Always update both calendar systems
    if (currentCalendar === 'persian') {
        currentPersianDate = gregorianToPersian(today);
        currentDate = today;
    } else {
        currentDate = today;
        currentPersianDate = gregorianToPersian(today);
    }
    
    // Update UI based on current calendar type
    updateCalendarHeader();
    renderDays();
    calendarCards();
    
    // Update events list for today based on current calendar
    const todayKey = currentCalendar === 'persian' 
        ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
        : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    
    dailyEventsCard(todayKey);
    
    updateSunTimesDisplay();

    // After calendar navigation
    await loadApiEvents();
    
    // Highlight today with a small delay to ensure DOM is updated
    setTimeout(() => {
        highlightToday();
    }, 100);
}

/**
 * Highlights today's date in the calendar
 */
function highlightToday() {
    // Clear previous selection
    const previouslySelected = daysGrid.querySelector('.day.selected');
    if (previouslySelected) {
        previouslySelected.classList.remove('selected');
    }
    
    const now = new Date();
    let todayPersian, todayKey, targetDay, currentMonth, currentYear;
    
    // Determine target day and current view based on calendar type
    if (currentCalendar === 'persian') {
        todayPersian = gregorianToPersian(now);
        todayKey = getDateKey(todayPersian.year, todayPersian.month, todayPersian.day);
        targetDay = todayPersian.day;
        currentMonth = currentPersianDate.month;
        currentYear = currentPersianDate.year;
    } else {
        todayKey = getDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
        targetDay = now.getDate();
        currentMonth = currentDate.getMonth() + 1;
        currentYear = currentDate.getFullYear();
    }
    
    // Only highlight if we're in the current month
    const isCurrentMonth = (currentCalendar === 'persian') ? 
        (currentPersianDate.year === todayPersian.year && currentPersianDate.month === todayPersian.month) :
        (currentDate.getFullYear() === now.getFullYear() && (currentDate.getMonth() + 1) === (now.getMonth() + 1));
    
    if (isCurrentMonth) {
        // Find today's element in the current view
        const dayElements = daysGrid.querySelectorAll('.day');
        let todayElement = null;
        
        dayElements.forEach(dayElement => {
            const primaryDate = dayElement.querySelector('.primary-date');
            if (primaryDate) {
                // Get the numeric value (remove any formatting for comparison)
                const dayText = primaryDate.textContent;
                const numericValue = parseInt(dayText.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                
                if (numericValue === targetDay) {
                    // Additional check to ensure it's the correct month and not from other month
                    if (!dayElement.classList.contains('other-month')) {
                        todayElement = dayElement;
                    }
                }
            }
        });
        
        if (todayElement) {
            todayElement.classList.add('selected');
            selectedDayElement = todayElement;
            
            // Scroll to today element if needed
            todayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    updateCalendarCards(todayKey);
    
    // Update events display
    dailyEventsCard(todayKey);
}

// ======================= EVENT MANAGEMENT =======================
/**
 * Handles day click for selection
 * @param {HTMLElement} dayElement - Clicked day element
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function handleDayClick(dayElement, year, month, day) {
    // Clear previous selection
    if (selectedDayElement) {
        selectedDayElement.classList.remove('selected');
    }
    
    // Set new selection
    dayElement.classList.add('selected');
    selectedDayElement = dayElement;

    const dateKey = getDateKey(year, month, day);
    
    // Update calendar cards with the selected date
    updateCalendarCards(dateKey);
    
    // Update events display
    dailyEventsCard(dateKey);
    
    // Also update the events list in modal if it's open
    if (eventModal.style.display === 'flex') {
        updateEventsList(dateKey);
    }
    
    // Update sun times for selected day
    updateSunTimesForSelectedDay(year, month, day);
    
    // If showDailyEvents is enabled, refresh API events to show selected day's events
    if (showDailyEvents && showApiEvents && apiEvents) {
        displayTabEvents(activeApiEventsTab, apiEvents);
    }    
}

/**
 * Opens event modal for adding new event
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function openEventModal(year, month, day) {
    const dateKey = getDateKey(year, month, day);
    
    // Update date display with proper number formatting
    if (currentCalendar === 'persian') {
        const formattedDate = `${formatNumber(year, currentLang)}/${formatNumber(month, currentLang)}/${formatNumber(day, currentLang)} (${langData.months.fa[month-1]})`;
        eventDate.value = formattedDate;
    } else {
        const formattedDate = `${langData.months.en[month]} ${formatNumber(day, 'en')}, ${formatNumber(year, 'en')}`;
        eventDate.value = formattedDate;
    }
    
    modalTitle.textContent = langData.ui.addEvent;
    eventTitle.value = '';
    eventDescription.value = '';
    
    eventForm.dataset.dateKey = dateKey;
    
    // Update events list for this date
    updateEventsList(dateKey);
    
    // Also update daily events card
    dailyEventsCard(dateKey);
    
    eventModal.style.display = 'flex';
}

/**
 * Closes event modal
 */
function closeEventModal() {
    eventModal.style.display = 'none';
}

/**
 * Saves new event to storage
 * @param {Event} e - Form submit event
 */
function saveEvent(e) {
    e.preventDefault();
    
    const dateKey = eventForm.dataset.dateKey;
    const title = eventTitle.value.trim();
    const description = eventDescription.value.trim();
    
    if (!title) {
        alert(langData.ui.enterEventTitle || 'لطفا عنوان رویداد را وارد کنید');
        return;
    }
    
    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    
    events[dateKey].push({
        title: title,
        description: description,
        id: Date.now().toString()
    });
    
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    
    // Update all displays
    dailyEventsCard(dateKey);
    updateEventsList(dateKey);
    renderDays(); // Update calendar dots
    
    // Reset form but keep modal open for adding more events
    eventTitle.value = '';
    eventDescription.value = '';
    eventTitle.focus();
}

/**
 * Updates events list for selected date in the modal
 * @param {string} dateKey - Date key for events lookup
 */
function updateEventsList(dateKey = null) {
    const eventsListContainer = document.getElementById('eventsList');
    if (!eventsListContainer) return;
    
    eventsListContainer.innerHTML = '';
    
    if (!dateKey) {
        showNoEventsMessage(eventsListContainer);
        return;
    }
    
    if (!events[dateKey] || events[dateKey].length === 0) {
        showNoEventsMessage(eventsListContainer);
        return;
    }
    
    // Render events in the modal
    renderEvents(eventsListContainer, dateKey);
}

/**
 * Shows no events message in container
 * @param {HTMLElement} container - Container element
 */
function showNoEventsMessage(container) {
    const noEvents = document.createElement('div');
    noEvents.textContent = langData.ui.noPersonalEvents;
    noEvents.style.textAlign = 'center';
    noEvents.style.padding = '10px';
    noEvents.style.opacity = '0.7';
    container.appendChild(noEvents);
}

/**
 * Renders events in container for specified date
 * @param {HTMLElement} container - Container element
 * @param {string} dateKey - Date key for events lookup
 */
function renderEvents(container, dateKey) {
    events[dateKey].forEach(event => {
        const eventItem = createEventItem(event, dateKey);
        container.appendChild(eventItem);
    });
}

/**
 * Creates event item element
 * @param {Object} event - Event object
 * @param {string} dateKey - Date key
 * @returns {HTMLElement} Event item element
 */
function createEventItem(event, dateKey) {
    const eventItem = document.createElement('div');
    eventItem.classList.add('event-item');
    
    const eventInfo = document.createElement('div');
    eventInfo.innerHTML = `<strong>${event.title}</strong>`;
    if (event.description) {
        eventInfo.innerHTML += `<br><small style="color: #666;">${event.description}</small>`;
    }
    
    const eventActions = document.createElement('div');
    eventActions.classList.add('event-actions');
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = langData.ui.delete || 'حذف';
    deleteBtn.style.background = '#ff4444';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEvent(dateKey, event.id);
    });
    
    eventActions.appendChild(deleteBtn);
    eventItem.appendChild(eventInfo);
    eventItem.appendChild(eventActions);
    
    return eventItem;
}

/**
 * Deletes event from storage
 * @param {string} dateKey - Date key
 * @param {string} eventId - Event ID
 */
function deleteEvent(dateKey, eventId) {
    if (events[dateKey]) {
        events[dateKey] = events[dateKey].filter(event => event.id !== eventId);
        
        if (events[dateKey].length === 0) {
            delete events[dateKey];
        }
        
        localStorage.setItem('calendarEvents', JSON.stringify(events));

        // Refresh all displays
        dailyEventsCard(dateKey);
        updateEventsList(dateKey);
        renderDays();
        
        // Show confirmation message
        showToast(langData.ui.eventDeleted || 'رویداد با موفقیت حذف شد');
    }
}

// ======================= CALENDAR CARDS & EVENTS DISPLAY =======================
/**
 * Updates calendar cards with current date
 * @param {string} dateKey - Date key for events lookup
 */
function updateCalendarCards(dateKey = null) {
    if (!dateKey) {
        // If no dateKey provided, use current date
        if (currentCalendar === 'persian') {
            dateKey = getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day);
        } else {
            dateKey = getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        }
    }
    
    // Parse dateKey to get year, month, day
    const [year, month, day] = dateKey.split('-').map(Number);
    
    // Update both calendar systems
    if (currentCalendar === 'persian') {
        currentPersianDate = { year, month, day };
        currentDate = persianToGregorian(currentPersianDate);
    } else {
        currentDate = new Date(year, month - 1, day);
        currentPersianDate = gregorianToPersian(currentDate);
    }
    
    calendarCards();
    
    // If showDailyEvents is enabled, refresh API events
    if (showDailyEvents && showApiEvents) {
        loadApiEvents();
    }    
}

/**
 * Renders calendar cards with current dates
 */
function calendarCards() {
    if (!persianDay || !gregorianDay) {
        console.warn('⚠️ Calendar card elements not found');
        return;
    }
    
    updatePersianCard();
    updateGregorianCard();
}

/**
 * Updates Persian calendar card
 */
function updatePersianCard() {
    if (persianDay && persianMonth && persianFullDate) {
        persianDay.textContent = formatNumber(currentPersianDate.day, currentLang);
        persianMonth.textContent = langData.months.fa[currentPersianDate.month - 1];
        
        const formattedDate = `${formatNumber(currentPersianDate.year, currentLang)}/${formatNumber(String(currentPersianDate.month).padStart(2,'0'), currentLang)}/${formatNumber(String(currentPersianDate.day).padStart(2,'0'), currentLang)}`;
        persianFullDate.textContent = formattedDate;
    }
}

/**
 * Updates Gregorian calendar card
 */
function updateGregorianCard() {
    if (gregorianDay && gregorianMonth && gregorianFullDate) {
        const gDate = persianToGregorian(currentPersianDate);
        gregorianDay.textContent = formatNumber(gDate.getDate(), 'en'); // Always English for Gregorian
        gregorianMonth.textContent = langData.months.en[gDate.getMonth()];
        
        const formattedDate = `${formatNumber(gDate.getFullYear(), 'en')}/${formatNumber(String(gDate.getMonth()+1).padStart(2,'0'), 'en')}/${formatNumber(String(gDate.getDate()).padStart(2,'0'), 'en')}`;
        gregorianFullDate.textContent = formattedDate;
    }
}

/**
 * Updates and displays daily events for selected date
 * @param {string} dateKey - Date key for events lookup
 */
function dailyEventsCard(dateKey) {
    const container = document.getElementById('dailyEventsContainer');
    const eventsList = document.getElementById('eventsList');
    
    // Update both containers
    updateEventsContainer(container, dateKey);
    updateEventsList(dateKey);
}

/**
 * Updates events container with events for specified date
 * @param {HTMLElement} container - Container element
 * @param {string} dateKey - Date key for events lookup
 */
function updateEventsContainer(container, dateKey) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!events[dateKey] || events[dateKey].length === 0) {
        showNoEventsMessage(container);
        return;
    }
    
    renderEvents(container, dateKey);
}

// ======================= LANGUAGE MANAGEMENT =======================
/**
 * Loads language data and applies it to the UI
 * @param {string} lang - Language code ('fa' or 'en')
 */
async function loadLanguage(lang) {
    try {
        const res = await fetch(`${BASE_PATH}/assets/lang/${lang}.json`);
        langData = await res.json();
        localStorage.setItem('lang', lang);
        currentLang = lang;

        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
        applyLanguage();
        
        currentDate = new Date();
        currentPersianDate = gregorianToPersian(currentDate);
        
        updateCalendarHeader();
        renderWeekdays();
        updateUITexts(currentLang);
        if (calendarTypeSelect) calendarTypeSelect.value = currentCalendar;
    } catch (err) {
        console.error(`Error loading language ${lang}:`, err);
    }
}

/**
 * Applies loaded language data to UI elements
 */
function applyLanguage() {
    if (!langData.ui) return;
    
    updateNavigationText();
    updateCalendarControlsText();
    updateAPIEventsText();
    updateModalText();
    updateFooterText();
    updatePwaText();
    updateFooterToggleText();    
    updateSettingsText();
    calendarCards();
    
    // Get current date key based on selected calendar
    const currentDateKey = currentCalendar === 'persian' 
        ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
        : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    
    // Update daily events card with new language
    dailyEventsCard(currentDateKey);    
}

/**
 * Updates navigation menu text based on current language
 */
function updateNavigationText() {
    const mainLogoText = langData.ui.logo;
    
    // Update logo based on current page
    if (currentPage === 'calendar') {
        document.querySelector('.logo').textContent = mainLogoText;
    } else {
        // Re-apply page title to logo
        let pageTitle = '';
        switch(currentPage) {
            case 'settings':
                pageTitle = langData.ui.settings || 'Settings';
                break;
            case 'privacy-policy':
                pageTitle = langData.ui.privacyPolicy || 'Privacy Policy';
                break;
            case 'terms':
                pageTitle = langData.ui.termsConditions || 'Terms & Conditions';
                break;
            case 'faq':
                pageTitle = langData.ui.faq || 'FAQ';
                break;
            case 'about':
                pageTitle = langData.ui.about || 'About';
                break;
        }
        updateLogoWithPageTitle(pageTitle);
    }

    const navItems = document.querySelectorAll('#navMenu li span');
    if (navItems[0]) navItems[0].textContent = langData.ui.calendar || 'Calendar';
    if (navItems[1]) navItems[1].textContent = langData.ui.settings || 'Settings';
    if (navItems[2]) navItems[2].textContent = langData.ui.about || 'About';
}

/**
 * Updates logo to show current page title alongside main logo
 * @param {string} pageTitle - Current page title
 */
function updateLogoWithPageTitle(pageTitle) {
    const logoElement = document.querySelector('.logo');
    if (!logoElement) return;
    
    const mainLogoText = langData.ui.logo || 'گاه‌شمار روزگار';
    
    if (pageTitle && currentPage !== 'calendar') {
        // Show page title alongside logo
        logoElement.innerHTML = `
            <span class="main-logo">${mainLogoText}</span>
            <span class="page-separator"></span>
            <span class="page-title">${pageTitle}</span>
        `;
        
        // Add CSS classes for styling
        logoElement.classList.add('logo-with-page-title');
    } else {
        // Show only main logo on calendar page
        logoElement.textContent = mainLogoText;
        logoElement.classList.remove('logo-with-page-title');
    }
}

/**
 * Updates calendar control buttons text
 */
function updateCalendarControlsText() {
    if (prevYearBtn) prevYearBtn.title = langData.ui.prevYear;
    if (prevMonthBtn) prevMonthBtn.title = langData.ui.prevMonth;
    if (todayBtn) todayBtn.title = langData.ui.today;
    if (nextMonthBtn) nextMonthBtn.title = langData.ui.nextMonth;
    if (nextYearBtn) nextYearBtn.title = langData.ui.nextYear;
}

/**
 * Updates calendar control buttons text
 */
function updateAPIEventsText() {
    const apiEventsLabel = document.querySelector('label[for="apiEventsToggle"]');
    if (apiEventsLabel) apiEventsLabel.textContent = langData.ui.showApiEvents || 'نمایش رویدادهای API';
    
    const apiEventsCalendarLabel = document.querySelector('label[for="apiEventsCalendarSelect"]');
    if (apiEventsCalendarLabel) apiEventsCalendarLabel.textContent = langData.ui.apiEventsCalendar || 'گاه‌شمار رویدادهای API';
    
    if (apiEventsCalendarSelect) {
        if (apiEventsCalendarSelect.options[0]) apiEventsCalendarSelect.options[0].text = langData.ui.bothCalendars || 'هر دو گاه‌شمار';
        if (apiEventsCalendarSelect.options[1]) apiEventsCalendarSelect.options[1].text = langData.ui.persian || 'فارسی';
        if (apiEventsCalendarSelect.options[2]) apiEventsCalendarSelect.options[2].text = langData.ui.gregorian || 'میلادی';
    }  
    
    const dailyEventsLabel = document.querySelector('label[for="dailyEventsToggle"]');
    if (dailyEventsLabel) dailyEventsLabel.textContent = langData.ui.showDailyEvents || 'نمایش رویدادهای روز جاری';    
}

/**
 * Updates modal and form text
 */
function updateModalText() {
    if (modalTitle) modalTitle.textContent = langData.ui.addEvent;
    if (eventTitle) eventTitle.placeholder = langData.ui.eventTitlePlaceholder;
    if (eventDescription) eventDescription.placeholder = langData.ui.eventDescriptionPlaceholder;
    if (cancelEvent) cancelEvent.textContent = langData.ui.cancel;
    if (eventTitleLabel) eventTitleLabel.textContent = langData.ui.eventTitleLabel;
    if (eventDateLabel) eventDateLabel.textContent = langData.ui.eventDateLabel; 
    if (eventDescriptionLabel) eventDescriptionLabel.textContent = langData.ui.eventDescriptionLabel;   
    if (submitEvent) submitEvent.textContent = langData.ui.submit;      
}

/**
 * Updates Footer text based on current language and date
 */
function updateFooterText() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    // Update about section
    const aboutSection = footer.querySelector('.footer-about p');
    if (aboutSection) {
        aboutSection.textContent = langData.ui.aboutDescription || 'گاه‌شمار روزگار - ابزاری کامل برای مدیریت زمان و رویدادها به دو زبان فارسی و انگلیسی';
    }

    // Update section titles
    const sectionTitles = footer.querySelectorAll('.footer-column h3');
    if (sectionTitles.length >= 4) {
        sectionTitles[0].textContent = langData.ui.about || 'درباره';
        sectionTitles[1].textContent = langData.ui.usefulLinks || 'لینک‌های مفید';
        sectionTitles[2].textContent = langData.ui.contactUs || 'تماس با ما';
        sectionTitles[3].textContent = langData.ui.moreInfo || 'اطلاعات بیشتر';
    }

    // Update useful links
    const usefulLinks = footer.querySelectorAll('.footer-column:nth-child(2) .footer-links li a');
    if (usefulLinks.length >= 2) {
        usefulLinks[0].textContent = langData.ui.roozegaar || 'روزگار';
        usefulLinks[1].textContent = langData.ui.roozegaarCalendar || 'گاه‌شمار روزگار';
    }

    // Update contact info labels
    const contactEmail = footer.querySelector('.contact-info li:nth-child(1) a');
    if (contactEmail) {
        contactEmail.textContent = langData.ui.supportEmail || 'ایمیل پشتیبانی';
        contactEmail.href = `mailto:${langData.ui.supportEmailAddress || 'mahdi2006d@gmail.com'}`;
    }

    // Update more info links
    const moreInfoLinks = footer.querySelectorAll('.footer-column:nth-child(4) .footer-links li a');
    if (moreInfoLinks.length >= 3) {
        moreInfoLinks[0].textContent = langData.ui.faq || 'سوالات متداول';        
        moreInfoLinks[1].textContent = langData.ui.privacyPolicy || 'حریم خصوصی';
        moreInfoLinks[2].textContent = langData.ui.termsConditions || 'قوانین و مقررات';
        moreInfoLinks[3].textContent = langData.ui.about || 'درباره';        
    }

    // Update copyright with dynamic date based on language
    const copyright = footer.querySelector('.footer-bottom p');
    if (copyright) {
        const currentYear = new Date().getFullYear();
        
        if (currentLang === 'fa') {
            // Convert to Jalali year for Persian
            const persianDate = gregorianToPersian(new Date());
            const jalaliYear = persianDate.year;
            copyright.textContent = `${langData.ui.copyright || 'کلیه حقوق مادی و معنوی این سایت متعلق به گاه‌شمار روزگار می‌باشد'} © ${jalaliYear}`;
        } else {
            // Use Gregorian year for English
            copyright.textContent = `${langData.ui.copyright || 'All rights reserved for Roozegaar Calendar'} © ${currentYear}`;
        }
    }

    // Update social media aria-labels
    const socialIcons = footer.querySelectorAll('.social-icons a');
    const socialLabels = [
        langData.ui.facebook || 'فیس‌بوک',
        langData.ui.twitter || 'توییتر',
        langData.ui.instagram || 'اینستاگرام',
        langData.ui.linkedin || 'لینکدین'
    ];

    socialIcons.forEach((icon, index) => {
        if (socialLabels[index]) {
            icon.setAttribute('aria-label', socialLabels[index]);
        }
    });

    // Update address based on language
    const addressElement = footer.querySelector('.contact-info li:nth-child(2) span');
    if (addressElement) {
        if (currentLang === 'fa') {
            addressElement.textContent = 'ایران';
        } else {
            addressElement.textContent = 'Iran';
        }
    }
}

/**
 * Updates Pwa text
 */
function updatePwaText() {
    if (pwaPromptTitle) pwaPromptTitle.textContent = langData.ui.pwaTitle;
    if (pwaPromptSubtitle) pwaPromptSubtitle.textContent = langData.ui.pwaSubtitle;
    if (pwaDismissBtn) {
        pwaDismissBtn.textContent = langData.ui.pwaDismiss;
        pwaDismissBtn.setAttribute('aria-label', langData.ui.pwaDismiss);
    }
    if (pwaInstallBtn) {
        pwaInstallBtn.textContent = langData.ui.pwaInstall;
        pwaInstallBtn.setAttribute('aria-label', langData.ui.pwaInstall);
    }
}

/**
 * Updates settings modal text
 */
function updateSettingsText() {
    const themeLabel = document.querySelector('label[for="themeSelect"]');
    if (themeLabel) themeLabel.textContent = langData.ui.theme || 'Theme';
    
    const langLabel = document.querySelector('label[for="langSelect"]');
    if (langLabel) langLabel.textContent = langData.ui.lang || 'Language';
    
    const calendarLabel = document.querySelector('label[for="calendarTypeSelect"]');
    if (calendarLabel) calendarLabel.textContent = langData.ui.settingsCalendar || 'Main Calendar';
    
    const secondaryLabel = document.querySelector('label[for="secondaryCalendarToggle"]');
    if (secondaryLabel) secondaryLabel.textContent = langData.ui.showSecondaryCalendar || 'Show Secondary Calendar';

    const provinceSelectLabel = document.querySelector('label[for="provinceSelectLabel"]');
    if (provinceSelectLabel) provinceSelectLabel.textContent = langData.ui.provinceSelectLabel || 'Choose the province';

    const resetSettings = document.getElementById('resetSettings');
    if (resetSettings) resetSettings.textContent = langData.ui.resetSettings || 'Reset Settings';

    if (themeSelect) {
        if (themeSelect.options[0]) themeSelect.options[0].text = langData.ui.themeDefault || 'System Default';        
        if (themeSelect.options[1]) themeSelect.options[1].text = langData.ui.light || 'Light';
        if (themeSelect.options[2]) themeSelect.options[2].text = langData.ui.dark || 'Dark';
    }
    
    if (langSelect) {
        if (langSelect.options[0]) langSelect.options[0].text = langData.ui.persian || 'Persian';
        if (langSelect.options[1]) langSelect.options[1].text = langData.ui.english || 'English';
    }
    
    if (calendarTypeSelect) {
        if (calendarTypeSelect.options[0]) calendarTypeSelect.options[0].text = langData.ui.persian || 'Persian';
        if (calendarTypeSelect.options[1]) calendarTypeSelect.options[1].text = langData.ui.gregorian || 'Gregorian';
    }
    
    // Update city select placeholder
    const citySelect = document.getElementById('citySelect');
    if (citySelect && citySelect.options[0]) {
        citySelect.options[0].text = currentLang === 'fa' ? 'انتخاب شهر' : 'Select City';
    }
    
    updateCitySelectOptions();
    
    updateAPIEventsText();
}

/**
 * Updates city select options based on current language
 */
function updateCitySelectOptions() {
    const citySelect = document.getElementById('citySelect');
    if (!citySelect || !cities) return;
    
    const options = citySelect.querySelectorAll('option');
    options.forEach(option => {
        const cityId = option.value;
        if (cityId && cities[cityId]) {
            const city = cities[cityId];
            option.textContent = currentLang === 'fa' 
                ? `${city.fa}`
                : `${city.en}`;
        }
    });
}

// ======================= API EVENTS MANAGEMENT =======================
/**
 * Loads and displays API events for current month
 */
async function loadApiEvents() {
    showApiEvents = localStorage.getItem('showApiEvents') !== 'false';
    apiEventsCalendar = localStorage.getItem('apiEventsCalendar') || 'both';
    
    const container = document.getElementById('apiEventsContainer');
    
    // Hide entire section if API events are disabled
    if (!showApiEvents) {
        if (apiEventsSection) {
            apiEventsSection.style.display = 'none';
        }
        if (container) {
            container.style.display = 'none';
        }
        return;
    }
    
    // Create tabs interface
    createApiEventsTabs();

    try {
        console.log('📅 Fetching API events...');
        const eventsData = await calendarAPI.getCurrentMonthEvents();
        console.log('📅 API events received:', eventsData);
        
        if (!eventsData || !eventsData.main || !eventsData.secondary) {
            throw new Error('Invalid API response structure');
        }
        
        const processedEvents = await processApiEvents(eventsData);
        
        // Cache the API events
        apiEvents = processedEvents;
        localStorage.setItem('apiCalendarEvents', JSON.stringify(apiEvents));
        
        // Load events for active tab
        displayTabEvents(activeApiEventsTab, processedEvents);
        
    } catch (error) {
        console.error('❌ Error loading API events:', error);
        const activeTabPane = document.getElementById(`${activeApiEventsTab}EventsTab`);
        if (activeTabPane) {
            activeTabPane.innerHTML = `
                <div class="no-api-events" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>${currentLang === 'fa' ? 'خطا در بارگذاری رویدادها' : 'Error loading events'}</p>
                    <small style="opacity: 0.7;">${error.message}</small>
                </div>
            `;
        }
    }
}

/**
 * Updates API events section visibility based on current settings
 */
function updateApiEventsSectionVisibility() {
    showApiEvents = localStorage.getItem('showApiEvents') !== 'false';
    
    console.log('👀 Updating API Events Section Visibility:', {
        showApiEvents: showApiEvents,
        apiEventsSection: !!apiEventsSection
    });
    
    if (apiEventsSection) {
        if (showApiEvents) {
            apiEventsSection.style.display = 'block';
            console.log('✅ API Events section set to visible');
        } else {
            apiEventsSection.style.display = 'none';
            console.log('❌ API Events section set to hidden');
        }
    } else {
        console.warn('⚠️ apiEventsSection element not found');
    }
}

/**
 * Processes API events to handle both events_by_day and events_by_month formats
 */
async function processApiEvents(eventsData) {
    const uniqueEvents = {
        main: { ...eventsData.main },
        secondary: { ...eventsData.secondary }
    };

    // Process main calendar events
    if (eventsData.main.events_by_month && !eventsData.main.events_by_day) {
        uniqueEvents.main.events_by_day = convertEventsByMonthToByDay(eventsData.main.events_by_month);
    } else if (eventsData.main.events_by_day) {
        uniqueEvents.main.events_by_day = removeDuplicateEvents(eventsData.main.events_by_day);
    } else {
        uniqueEvents.main.events_by_day = {};
    }

    // Process secondary calendar events
    if (eventsData.secondary.events_by_month && !eventsData.secondary.events_by_day) {
        uniqueEvents.secondary.events_by_day = convertEventsByMonthToByDay(eventsData.secondary.events_by_month);
    } else if (eventsData.secondary.events_by_day) {
        uniqueEvents.secondary.events_by_day = removeDuplicateEvents(eventsData.secondary.events_by_day);
    } else {
        uniqueEvents.secondary.events_by_day = {};
    }

    return uniqueEvents;
}

/**
 * Converts events_by_month format to events_by_day format with proper numeric ordering
 * @param {Object} eventsByMonth - Events organized by month
 * @returns {Object} Events organized by day in "M/D" format
 */
function convertEventsByMonthToByDay(eventsByMonth) {
    const eventsByDay = {};

    if (!eventsByMonth || typeof eventsByMonth !== 'object') {
        return eventsByDay;
    }

    // Sort months numerically
    const sortedMonths = Object.keys(eventsByMonth)
        .map(Number)
        .sort((a, b) => a - b);

    sortedMonths.forEach(month => {
        const monthEvents = eventsByMonth[month];
        if (monthEvents && typeof monthEvents === 'object') {
            // Sort days numerically within each month
            const sortedDays = Object.keys(monthEvents)
                .map(Number)
                .sort((a, b) => a - b);

            sortedDays.forEach(day => {
                const dayEvents = monthEvents[day];
                if (Array.isArray(dayEvents)) {
                    const dateKey = `${month}/${day}`; // Unique key
                    const eventsWithMeta = dayEvents.map(event => ({
                        ...event,
                        month,
                        day
                    }));
                    eventsByDay[dateKey] = eventsWithMeta;
                }
            });
        }
    });

    return eventsByDay;
}

/**
 * Removes duplicate events from events_by_day object
 * @param {Object} eventsByDay - Events organized by day
 * @returns {Object} Events with duplicates removed
 */
function removeDuplicateEvents(eventsByDay) {
    const seen = new Set();
    const uniqueEventsByDay = {};
    
    if (!eventsByDay || typeof eventsByDay !== 'object') {
        return uniqueEventsByDay;
    }

    Object.keys(eventsByDay).forEach(day => {
        const dayEvents = eventsByDay[day];
        if (Array.isArray(dayEvents)) {
            uniqueEventsByDay[day] = dayEvents.filter(event => {
                const eventKey = `${event.title}-${event.description}-${event.type}-${event.is_holiday}`;
                if (!seen.has(eventKey)) {
                    seen.add(eventKey);
                    return true;
                }
                return false;
            });
        }
    });

    return uniqueEventsByDay;
}

/**
 * Creates API events section with daily events filtering support
 * @param {Object} eventsData - Events data
 * @param {string} calendarTitle - Calendar title
 * @param {string} rangeInfoText - Range information text (optional)
 * @returns {HTMLElement} Events section element
 */
function createApiEventsSection(eventsData, calendarTitle, rangeInfoText = '') {
    const section = document.createElement('div');
    section.className = 'api-events-section';
    if (apiEventsCalendar != 'both') {
        section.style.borderRadius = '10px';
    }
    const header = document.createElement('div');
    header.className = 'api-events-section-header';
    
    // Filter events if showDailyEvents is enabled
    let filteredEventsData = { ...eventsData };
    let eventsCount = eventsData.total_events || 0;
    
    if (showDailyEvents) {
        // Filter events to show only today's events
        const todayEvents = filterTodayApiEvents(eventsData);
        filteredEventsData.events_by_day = todayEvents;
        eventsCount = Object.keys(todayEvents).length > 0 ? 
            todayEvents[Object.keys(todayEvents)[0]].length : 0;
        
        // Update counts for display
        filteredEventsData.total_events = eventsCount;
        filteredEventsData.fixed_events_count = todayEvents[Object.keys(todayEvents)[0]]?.filter(e => e.type === 'fixed').length || 0;
        filteredEventsData.floating_events_count = todayEvents[Object.keys(todayEvents)[0]]?.filter(e => e.type === 'floating').length || 0;
    }
    
    const totalEvents = filteredEventsData.total_events || 0;
    const fixedCount = filteredEventsData.fixed_events_count || 0;
    const floatingCount = filteredEventsData.floating_events_count || 0;
    
    const calendarType = eventsData.calendar || 'persian';
    const calendarName = calendarType === 'persian' 
        ? (currentLang === 'fa' ? 'گاه‌شمار فارسی' : 'Persian Calendar')
        : (currentLang === 'fa' ? 'گاه‌شمار میلادی' : 'Gregorian Calendar');

    const formattedCount = formatNumber(totalEvents, currentLang);
    const formattedFixed = formatNumber(fixedCount, currentLang);
    const formattedFloating = formatNumber(floatingCount, currentLang);
    
    header.innerHTML = `
        <div>
            <h4>${calendarName}</h4>
            <small style="opacity: 0.9;">${calendarTitle}</small>
            <div style="margin-top: 5px; font-size: 0.8em;">
                <i class="fas ${showDailyEvents ? 'fa-calendar-day' : 'fa-calendar-alt'}"></i>
                ${showDailyEvents
                    ? (currentLang === 'fa' ? 'رویدادهای روز جاری' : 'Current Day Events')
                    : (currentLang === 'fa' ? 'رویدادهای ماه جاری' : 'Current Month Events')}
            </div>
        </div>
        <div class="meta-right">
            <span class="api-events-count">${formattedCount} ${currentLang === 'fa' ? 'رویداد' : 'events'}</span>
            <span class="api-events-count">${formattedFixed} ${currentLang === 'fa' ? 'ثابت' : 'fixed'}</span>
            <span class="api-events-count">${formattedFloating} ${currentLang === 'fa' ? 'نامنظم' : 'irregular'}</span>
        </div>
    `;

    section.appendChild(header);

    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'api-events-container-inner';

    // Use filtered events data
    const eventsByDay = filteredEventsData.events_by_day || {};

    // Add range info at the top if available AND daily view is disabled
    if (rangeInfoText && !showDailyEvents) {
        const rangeInfoElement = document.createElement('div');
        rangeInfoElement.className = 'api-events-range-info';
        rangeInfoElement.innerHTML = `
            <div class="range-info-header">
                <i class="fas fa-calendar-alt"></i>
                <span>${rangeInfoText}</span>
            </div>
        `;
        eventsContainer.appendChild(rangeInfoElement);
    }

    // Add events for each day, sorted by day
    if (Object.keys(eventsByDay).length > 0) {
        // Sort days numerically
        const sortedDays = Object.keys(eventsByDay).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedDays.forEach(day => {
            const dayEvents = eventsByDay[day];
            
            if (Array.isArray(dayEvents) && dayEvents.length > 0) {
                // Sort events by priority (if available) or title
                const sortedEvents = dayEvents.sort((a, b) => {
                    if (a.priority && b.priority) {
                        return a.priority - b.priority;
                    }
                    return a.title.localeCompare(b.title);
                });

                sortedEvents.forEach(event => {
                    const eventElement = createApiEventElement(event, day, calendarType);
                    eventsContainer.appendChild(eventElement);
                });
            }
        });
    } else {
        const noEvents = document.createElement('div');
        noEvents.className = 'no-api-events';
        noEvents.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 2.5rem; opacity: 0.5; margin-bottom: 0.5rem;">
                    <i class="fas ${showDailyEvents ? 'fa-calendar-day' : 'fa-calendar-alt'}"></i>
                </div>
                <div style="font-size: 0.95rem;">
                    ${showDailyEvents 
                        ? (currentLang === 'fa' ? 'هیچ رویدادی برای امروز وجود ندارد' : 'No events found for today')
                        : (currentLang === 'fa' ? 'هیچ رویدادی برای این بازه زمانی وجود ندارد' : 'No events found for this date range')}
                </div>
            </div>
        `;
        eventsContainer.appendChild(noEvents);
    }

    section.appendChild(eventsContainer);
    return section;
}
    
/**
 * Filters API events to show only today's events
 * @param {Object} eventsData - Events data from API
 * @returns {Object} Filtered events by day
 */
function filterTodayApiEvents(eventsData) {
    const todayEvents = {};
    
    // Get today's date based on the calendar type of this events data
    const calendarType = eventsData.calendar || 'persian';
    let todayDay, todayMonth, todayYear;
    
    if (calendarType === 'persian') {
        todayDay = currentPersianDate.day;
        todayMonth = currentPersianDate.month;
        todayYear = currentPersianDate.year;
    } else {
        todayDay = currentDate.getDate();
        todayMonth = currentDate.getMonth() + 1;
        todayYear = currentDate.getFullYear();
    }
    
    const eventsByMonth = eventsData.events_by_month || {};
    const eventsByDay = eventsData.events_by_day || {};
    
    console.log('🔍 Filtering events for:', {
        calendarType,
        todayDate: `${todayYear}/${todayMonth}/${todayDay}`,
        eventsByMonthKeys: Object.keys(eventsByMonth),
        eventsByDayKeys: Object.keys(eventsByDay)
    });
    
    // Handle different data structures based on calendar type
    if (Tab === 'main') {
        // For Persian calendar: events_by_day uses simple day numbers as keys
        Object.keys(eventsByDay).forEach(dayKey => {
            const day = parseInt(dayKey);
            
            // Check if this day matches today's day
            if (day === todayDay) {
                todayEvents[dayKey] = eventsByDay[dayKey];
            }
        });
        
        // Also check events_by_month structure for Persian calendar
        if (eventsByMonth[todayMonth] && eventsByMonth[todayMonth][todayDay]) {
            const dateKey = todayDay.toString();
            todayEvents[dateKey] = eventsByMonth[todayMonth][todayDay];
        }
        
    } else {
        // For Gregorian calendar: events_by_day uses "M/D" format as keys
        Object.keys(eventsByDay).forEach(dateKey => {
            const [month, day] = dateKey.split('/').map(Number);
            
            // Check if this event matches today's date
            if (month === todayMonth && day === todayDay) {
                todayEvents[dateKey] = eventsByDay[dateKey];
            }
        });
        
        // Also check events_by_month structure for Gregorian calendar
        if (eventsByMonth[todayMonth] && eventsByMonth[todayMonth][todayDay]) {
            const dateKey = `${todayMonth}/${todayDay}`;
            todayEvents[dateKey] = eventsByMonth[todayMonth][todayDay];
        }
    }
    
    console.log('✅ Filtered today events result:', {
        foundEvents: Object.keys(todayEvents).length,
        todayEvents
    });
    
    return todayEvents;
}

/**
 * Creates API event element
 * @param {Object} event - Event object
 * @param {string} day - Day number
 * @param {string} calendarType - Calendar type
 * @returns {HTMLElement} Event element
 */
function createApiEventElement(event, day, calendarType) {
    const eventElement = document.createElement('div');
    eventElement.className = `api-event-item ${event.is_holiday ? 'holiday' : ''}`;
    
    const formattedDay = formatNumber(day, currentLang);
    
    // Get month name for API events - use event.month if available, otherwise use current month
    let monthName = '';
    let monthIndex;
    
    // Determine month index - prefer event.month, fallback to current month
    if (event.month && !isNaN(event.month)) {
        monthIndex = event.month - 1;
    } else {
        monthIndex = calendarType === 'persian' 
            ? currentPersianDate.month - 1 
            : currentDate.getMonth();
    }
    
    monthIndex = Math.max(0, Math.min(11, monthIndex));
    
    // Get month name based on calendar type
    if (calendarType === 'persian') {
        monthName = langData.months.fa[monthIndex];
    } else {
        monthName = langData.months.en[monthIndex];
    }
    
    const title = document.createElement('div');
    title.className = 'api-event-title';
    title.textContent = event.title;
    
    if (event.is_holiday) {
        title.style.color = '#f44336';
        title.style.fontWeight = '700';
    }

    const description = document.createElement('div');
    description.className = 'api-event-description';
    description.textContent = event.description;
    
    if (event.is_holiday) {
        description.style.color = '#f44336';
    }

    const meta = document.createElement('div');
    meta.className = 'api-event-meta';
    
    const dayInfo = document.createElement('span');
    dayInfo.className = 'api-event-day';
        
    const monthNameText = eventsToShow.range ? `(${monthName})` : monthName
    if (currentLang === 'fa') {
        dayInfo.textContent = `${formattedDay} ${monthNameText}`;
    } else {
        dayInfo.textContent = `${monthNameText} ${formattedDay}`;
    }

    const type = document.createElement('span');
    type.className = 'api-event-type';
    type.textContent = currentLang === 'fa' ? 'مناسبت' : 'Event';

    const eventTypeSpan = document.createElement('span');
    eventTypeSpan.className = 'api-event-type';
    eventTypeSpan.textContent = event.type === 'floating'
        ? (currentLang === 'fa' ? 'نامنظم' : 'Irregular')
        : (currentLang === 'fa' ? 'ثابت' : 'Fixed');

    const holidaySpan = document.createElement('span');
    holidaySpan.className = `api-event-type ${event.is_holiday ? 'holiday' : ''}`;
    holidaySpan.textContent = event.is_holiday
        ? (currentLang === 'fa' ? 'تعطیل' : 'Holiday')
        : (currentLang === 'fa' ? 'غیرتعطیل' : 'Non-Holiday');

    const rightGroup = document.createElement('div');
    rightGroup.className = 'meta-right';
    rightGroup.appendChild(type);
    rightGroup.appendChild(eventTypeSpan);
    rightGroup.appendChild(holidaySpan);

    meta.setAttribute('dir', currentLang === 'fa' ? 'rtl' : 'ltr');
    meta.appendChild(dayInfo);
    meta.appendChild(rightGroup);

    eventElement.appendChild(title);
    eventElement.appendChild(description);
    eventElement.appendChild(meta);

    return eventElement;
}


/**
 * Creates dynamic API events tabs based on apiEventsCalendar setting
 */
function createApiEventsTabs() {
    const container = document.getElementById('apiEventsContainer');
    if (!container) return;

    // Determine which calendars to show based on apiEventsCalendar setting
    let tabsToShow = [];
    
    switch(apiEventsCalendar) {
        case 'both':
            tabsToShow = ['main', currentCalendar === 'persian' ? 'gregorian' : 'persian'];
            break;
        case 'persian':
            tabsToShow = ['persian'];
            break;
        case 'gregorian':
            tabsToShow = ['gregorian'];
            break;
        default:
            tabsToShow = ['main', currentCalendar === 'persian' ? 'gregorian' : 'persian'];
    }

    // Update active tab if current tab is not available in new setting
    if (!tabsToShow.includes(activeApiEventsTab)) {
        activeApiEventsTab = tabsToShow[0];
        localStorage.setItem('activeApiEventsTab', activeApiEventsTab);
    }

    // Generate tab HTML based on available tabs
    let tabsHTML = '';
    let panesHTML = '';

    tabsToShow.forEach(tabId => {
        const isActive = tabId === activeApiEventsTab;
        
        // Determine tab name based on calendar type
        let tabName = '';
        if (tabId === 'main') {
            tabName = currentLang === 'fa' ? 
                (currentCalendar === 'persian' ? 'گاه‌شمار فارسی' : 'گاه‌شمار میلادی') :
                (currentCalendar === 'persian' ? 'Persian Calendar' : 'Gregorian Calendar');
        } else {
            tabName = currentLang === 'fa' ?
                (tabId === 'persian' ? 'گاه‌شمار فارسی' : 'گاه‌شمار میلادی') :
                (tabId === 'persian' ? 'Persian Calendar' : 'Gregorian Calendar');
        }

        tabsHTML += `
            <button class="api-tab ${isActive ? 'active' : ''}" 
                    data-tab="${tabId}" id="${tabId}CalendarTab">
                ${tabName}
            </button>
        `;

        panesHTML += `
            <div class="api-tab-pane ${isActive ? 'active' : ''}" id="${tabId}EventsTab">
                <!-- Events for ${tabId} calendar will be loaded here -->
            </div>
        `;
    });

    // If only one tab, don't show tab headers
    const showTabs = tabsToShow.length > 1;
    
    container.innerHTML = `
        <div class="api-events-tabs">
            ${showTabs ? `
                <div class="api-tabs-header">
                    ${tabsHTML}
                </div>
            ` : ''}
            <div class="api-tabs-content-wrapper ${!showTabs ? 'single-tab' : ''}">
                ${panesHTML}
            </div>
        </div>
    `;

    setupApiEventsTabs();
}

/**
 * Sets up API events tab functionality
 */
function setupApiEventsTabs() {
    const tabs = document.querySelectorAll('.api-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchApiEventsTab(tabId);
        });
    });
}

/**
 * Switches between API events tabs
 * @param {string} tabId - Tab identifier
 */
function switchApiEventsTab(tabId) {
    // Update active tab
    document.querySelectorAll('.api-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.api-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    const activePane = document.getElementById(`${tabId}EventsTab`);
    
    if (activeTab && activePane) {
        activeTab.classList.add('active');
        activePane.classList.add('active');
        activeApiEventsTab = tabId;
        Tab = tabId;
        localStorage.setItem('activeApiEventsTab', tabId);
        
        // Load events for the active tab if not already loaded
        loadTabEvents(tabId);
    }
}

/**
 * Loads events for specific tab
 * @param {string} tabId - Tab identifier
 */
async function loadTabEvents(tabId) {
    const tabPane = document.getElementById(`${tabId}EventsTab`);
    if (!tabPane) return;

    // Show loading state
    tabPane.innerHTML = '<div class="api-events-loading">در حال بارگذاری...</div>';

    try {
        const eventsData = await calendarAPI.getCurrentMonthEvents();
        const processedEvents = await processApiEvents(eventsData);
        displayTabEvents(tabId, processedEvents);
    } catch (error) {
        console.error(`Error loading ${tabId} events:`, error);
        tabPane.innerHTML = '<div class="no-api-events">خطا در بارگذاری رویدادها</div>';
    }
}

/**
 * Displays events in specific tab based on apiEventsCalendar setting
 * @param {string} tabId - Tab identifier
 * @param {Object} eventsData - Events data
 */
function displayTabEvents(tabId, eventsData) {
    const tabPane = document.getElementById(`${tabId}EventsTab`);
    if (!tabPane) return;

    let calendarTitle = '';
    let isRangeData = false;
    let rangeInfoText = '';

    // Determine which events to show based on tabId and apiEventsCalendar
    if (tabId === 'main') {
        eventsToShow = eventsData.main;
        calendarTitle = currentLang === 'fa' ? 'رویدادهای گاه‌شمار اصلی' : 'Main Calendar Events';
        isRangeData = false;
    } else if (tabId === 'persian') {
        // Show Persian events from either main or secondary based on which calendar is Persian
        if (eventsData.main.calendar === 'persian') {
            eventsToShow = eventsData.main;
            isRangeData = false;
        } else {
            eventsToShow = eventsData.secondary;
            isRangeData = true;
            
            // Generate range info text for Persian secondary calendar
            if (eventsToShow.range && !showDailyEvents) {
                const start = formatNumber(eventsToShow.range.start, currentLang);
                const end = formatNumber(eventsToShow.range.end, currentLang);
                rangeInfoText = currentLang === 'fa' 
                    ? `بازه زمانی: ${start} تا ${end}`
                    : `Date Range: ${start} to ${end}`;
            }
        }
        calendarTitle = currentLang === 'fa' ? 'رویدادهای گاه‌شمار فارسی' : 'Persian Calendar Events';
    } else if (tabId === 'gregorian') {
        // Show Gregorian events from either main or secondary based on which calendar is Gregorian
        if (eventsData.main.calendar === 'gregorian') {
            eventsToShow = eventsData.main;
            isRangeData = false;
        } else {
            eventsToShow = eventsData.secondary;
            isRangeData = true;
            
            // Generate range info text for Gregorian secondary calendar
            if (eventsToShow.range && !showDailyEvents) {
                const start = formatNumber(eventsToShow.range.start, 'en');
                const end = formatNumber(eventsToShow.range.end, 'en');
                rangeInfoText = currentLang === 'fa' 
                    ? `بازه زمانی: ${start} تا ${end}`
                    : `Date Range: ${start} to ${end}`;
            }
        }
        calendarTitle = currentLang === 'fa' ? 'رویدادهای گاه‌شمار میلادی' : 'Gregorian Calendar Events';
    }

    if (eventsToShow && eventsToShow.success && eventsToShow.total_events > 0) {
        tabPane.innerHTML = '';
        
        const eventsSection = createApiEventsSection(eventsToShow, calendarTitle, rangeInfoText);
        tabPane.appendChild(eventsSection);
    } else {
        tabPane.innerHTML = `
            <div class="no-api-events" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>${currentLang === 'fa' ? 'رویدادی در گاه‌شمار رسمی برای این بازه وجود ندارد' : 'There are no events in the official calendar for this period'}</p>
            </div>
        `;
    }
}

/**
 * Updates API events tabs when calendar type changes
 */
function updateApiEventsTabs() {
    if (document.getElementById('apiEventsContainer')) {
        createApiEventsTabs();
        // Reload events for active tab
        if (activeApiEventsTab) {
            loadTabEvents(activeApiEventsTab);
        }
    }
}

// ======================= SETTINGS MANAGEMENT =======================
/**
 * Initializes settings modal functionality
 */
function initializeSettingsModal() {
    const settingsNavItem = document.querySelector('#navMenu li:nth-child(3) a');
    if (settingsNavItem) {
        settingsNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            if (settingsModal) settingsModal.style.display = 'flex';
            if (calendarTypeSelect) calendarTypeSelect.value = currentCalendar;
            if (secondaryCalendarToggle) secondaryCalendarToggle.checked = showSecondaryCalendar;
        });
    }

    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.style.display = 'none';
        });
    }

    if (themeSelect) themeSelect.value = localStorage.getItem('theme') || 'light';
    if (langSelect) langSelect.value = currentLang;
}

/**
 * Sets up settings change handlers
 */
function setupSettingsHandlers() {
    if (themeSelect) themeSelect.addEventListener('change', handleThemeChange);
    if (langSelect) langSelect.addEventListener('change', handleLanguageChange);
    if (calendarTypeSelect) calendarTypeSelect.addEventListener('change', handleCalendarTypeChange);
    if (secondaryCalendarToggle) secondaryCalendarToggle.addEventListener('change', handleSecondaryCalendarToggle);
    showApiEvents = localStorage.getItem('showApiEvents') !== 'false';
    apiEventsCalendar = localStorage.getItem('apiEventsCalendar') || 'both';

    // Update secondary calendar toggle handler
    if (secondaryCalendarToggle) {
        secondaryCalendarToggle.checked = showSecondaryCalendar;
        secondaryCalendarToggle.addEventListener('change', handleSecondaryCalendarToggle);
    } 
        
    if (apiEventsToggle) {
        apiEventsToggle.checked = showApiEvents;
        apiEventsToggle.addEventListener('change', handleApiEventsToggle);
    }

    if (apiEventsCalendarSelect) {
        apiEventsCalendarSelect.value = apiEventsCalendar;
        apiEventsCalendarSelect.addEventListener('change', handleApiEventsCalendarChange);
    }
}

/**
 * Handles language change from settings
 */
function handleLanguageChange() {
    const lang = langSelect.value;
    loadLanguage(lang);
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles calendar type change from settings
 */
function handleCalendarTypeChange(e) {
    switchCalendar(e.target.value);
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles secondary calendar toggle change
 */
function handleSecondaryCalendarToggle() {
    showSecondaryCalendar = secondaryCalendarToggle.checked;
    localStorage.setItem('showSecondaryCalendar', showSecondaryCalendar);
    
    // Re-render calendar to reflect changes
    renderDays();
    
    // If secondary calendar is disabled, don't load its events
    if (!showSecondaryCalendar && activeApiEventsTab !== 'main') {
        // Switch to main calendar tab if secondary is disabled
        switchApiEventsTab('main');
    }
    
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles API events toggle change
 */
function handleApiEventsToggle() {
    showApiEvents = apiEventsToggle.checked;
    localStorage.setItem('showApiEvents', showApiEvents);
        
    if (showApiEvents) {
        // Show section and load events
        if (apiEventsSection) {
            apiEventsSection.style.display = 'block';
        }
        loadApiEvents();
    } else {
        // Hide entire section
        if (apiEventsSection) {
            apiEventsSection.style.display = 'none';
        }
    }
    
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles API events calendar selection change - Debug version
 */
function handleApiEventsCalendarChange() {
    const oldValue = apiEventsCalendar;
    apiEventsCalendar = apiEventsCalendarSelect.value;
    
    console.log('🔧 API Events Calendar Change:');
    console.log('  - Old value:', oldValue);
    console.log('  - New value:', apiEventsCalendar);
    console.log('  - Select element value:', apiEventsCalendarSelect.value);
    console.log('  - LocalStorage before:', localStorage.getItem('apiEventsCalendar'));
    
    localStorage.setItem('apiEventsCalendar', apiEventsCalendar);
    
    console.log('  - LocalStorage after:', localStorage.getItem('apiEventsCalendar'));
    console.log('  - Global variable:', apiEventsCalendar);
    
    // Force reload of API events
    loadApiEvents();
    
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles daily events toggle change
 */
function handleDailyEventsToggle() {
    showDailyEvents = dailyEventsToggle.checked;
    localStorage.setItem('showDailyEvents', showDailyEvents);
    
    // Update API events display to reflect changes
    if (showApiEvents && apiEvents) {
        displayTabEvents(activeApiEventsTab, apiEvents);
    }
    
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Switches between Persian and Gregorian calendars
 * @param {string} type - Calendar type ('persian' or 'gregorian')
 */
function switchCalendar(type) {
    if (currentCalendar === type) return;
    
    currentCalendar = type;    
    localStorage.setItem('calendarType', type);
    
    document.body.setAttribute('data-calendar', type);

    if (type === 'persian') {
        currentPersianDate = gregorianToPersian(currentDate);
    } else {
        currentDate = persianToGregorian(currentPersianDate);
    }
    
    // Update UI
    updateCalendarHeader();
    renderWeekdays();
    renderDays();
    calendarCards();
    highlightToday();
    
    // Update API events tabs dynamically
    updateApiEventsTabs();
}

// ======================= NUMBER FORMATTING =======================
/**
 * Formats numbers based on current language
 * @param {number|string} number - Number to format
 * @param {string} lang - Language code ('fa' or 'en')
 * @returns {string} Formatted number
 */
function formatNumber(value, lang = currentLang) {
    if (typeof value !== 'string' && typeof value !== 'number') return value;

    const str = value.toString();

    if (lang === 'fa') {
        return str.replace(/\d/g, d =>
            ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][d]
        );
    } else {
        return str;
    }
}

// ======================= PWA FUNCTIONALITY =======================
/**
 * Handles PWA installation prompt
 */
function initializePWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'block';
    });

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
            }
        });
    }

    if (pwaDismissBtn) {
        pwaDismissBtn.addEventListener('click', () => {
            if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
        deferredPrompt = null;
    });
}

/**
 * Registers service worker for PWA functionality
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(`${BASE_PATH}/assets/js/service-worker.js`)
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// ======================= SUNRISE/SUNSET DISPLAY =======================
/**
 * Improved sun times display updater
 */
function updateSunTimesDisplay() {
    try {
        if (!cities || Object.keys(cities).length === 0) {
            console.warn('⚠️ Cities data not loaded yet');
            setTimeout(updateSunTimesDisplay, 500);
            return;
        }
        
        if (!cities[currentCity]) {
            console.warn(`⚠️ Current city "${currentCity}" not found, using Tehran`);
            currentCity = 'tehran';
            localStorage.setItem('selectedCity', currentCity);
        }
        
        let date;
        if (selectedDayElement) {
            date = getSelectedDate();
        } else {
            date = new Date();
        }
        
        const sunTimes = getSunTimes(currentCity, date);
        
        if (!sunTimes || !sunTimes.sunrise || !sunTimes.sunset) {
            throw new Error('Invalid sun times calculation');
        }
        
        const sunriseTime = formatTime(sunTimes.sunrise, currentLang);
        const sunsetTime = formatTime(sunTimes.sunset, currentLang);
        const dayDuration = calculateDayDuration(sunTimes.sunrise, sunTimes.sunset);
        
        updateSunTimesCard(sunriseTime, sunsetTime, dayDuration, date);
        
    } catch (error) {
        console.error('❌ Error updating sun times display:', error);
        showSunTimesError();
    }
}

/**
 * Shows error message when sun times calculation fails
 */
function showSunTimesError() {
    const container = document.getElementById('sunTimesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="sun-times-header">
            <h4 class="sun-times-title">${currentLang === 'fa' ? 'طلوع و غروب خورشید' : 'Sunrise & Sunset'}</h4>
            <span class="sun-times-city">${currentLang === 'fa' ? 'خطا در محاسبات' : 'Calculation Error'}</span>
        </div>
        
        <div class="sun-times-error">
            <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="error-message">
                <h5>${currentLang === 'fa' ? 'خطا در محاسبه زمان‌ها' : 'Error calculating times'}</h5>
                <p>${currentLang === 'fa' ? 'امکان محاسبه طلوع و غروب در حال حاضر وجود ندارد' : 'Unable to calculate sunrise and sunset at this time'}</p>
            </div>
        </div>
        
        <div class="sun-times-footer">
            <span class="sun-times-info" style="color: var(--warning-color);">
                <i class="fas fa-clock"></i>
                ${currentLang === 'fa' ? 'لطفاً مجدداً تلاش کنید' : 'Please try again later'}
            </span>
        </div>
    `;
}

/**
 * Gets the currently selected date
 * @returns {Date} Selected date
 */
function getSelectedDate() {
    if (currentCalendar === 'persian') {
        return persianToGregorian(currentPersianDate);
    } else {
        return currentDate;
    }
}

/**
 * Calculates day duration between sunrise and sunset
 * @param {Date} sunrise - Sunrise time
 * @param {Date} sunset - Sunset time
 * @returns {string} Formatted duration
 */
function calculateDayDuration(sunrise, sunset) {
    const durationMs = sunset - sunrise;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (currentLang === 'fa') {
        return `${formatNumber(hours, 'fa')} ساعت و ${formatNumber(minutes, 'fa')} دقیقه`;
    } else {
        return `${hours}h ${minutes}m`;
    }
}

/**
 * Updates the sun times card with current data
 */
function updateSunTimesCard(sunrise, sunset, duration, date) {
    const container = document.getElementById('sunTimesContainer');
    if (!container) return;
    
    const cityData = cities[currentCity];
    if (!cityData) return;
    
    const cityName = currentLang === 'fa' ? cityData.fa : cityData.en;
    const dateFormatted = formatDateForCard(date);
    
    container.innerHTML = `
        <div class="sun-times-header">
            <h4 class="sun-times-title">${currentLang === 'fa' ? 'طلوع و غروب خورشید' : 'Sunrise & Sunset'}</h4>
            <span class="sun-times-city">
                ${cityName}
                <i class="fas fa-map-marker-alt"></i></span>
        </div>
        
        <div class="sun-times-content">
            <div class="sun-time-item">
                <div class="sun-time-icon"><i class="fas fa-sun"></i></div>
                <div class="sun-time-label">${currentLang === 'fa' ? 'طلوع' : 'Sunrise'}</div>
                <div class="sun-time-value">${sunrise}</div>
            </div>
            
            <div class="sun-time-item">
                <div class="sun-time-icon"><i class="fas fa-moon"></i></div>
                <div class="sun-time-label">${currentLang === 'fa' ? 'غروب' : 'Sunset'}</div>
                <div class="sun-time-value">${sunset}</div>
            </div>
        </div>
        
        <div class="sun-times-footer">
            <span class="sun-times-date">
                <i class="fas fa-calendar"></i>
                ${dateFormatted}
            </span>
            <span class="sun-times-info">
                ${currentLang === 'fa' ? 'طول روز:' : 'Day length:'} ${duration}
                <i class="fas fa-clock"></i>				
            </span>
        </div>
    `;
}

/**
 * Formats date for display in sun times card
 */
function formatDateForCard(date) {
    if (currentCalendar === 'persian') {
        const persianDate = gregorianToPersian(date);
        const monthName = langData.months.fa[persianDate.month - 1];
        return `${formatNumber(persianDate.day, currentLang)} ${monthName} ${formatNumber(persianDate.year, currentLang)}`;
    } else {
        const monthName = langData.months.en[date.getMonth()];
        return `${monthName} ${formatNumber(date.getDate(), 'en')}, ${formatNumber(date.getFullYear(), 'en')}`;
    }
}

/**
 * Formats time based on language
 */
function formatTime(date, lang) {
    const options = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: lang === 'en'
    };
    
    return date.toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-US', options);
}

/**
 * Updates sun times display for selected day
 */
function updateSunTimesForSelectedDay(year, month, day) {
    if (!cities[currentCity]) {
        console.warn('⚠️ Current city not found for sun times');
        return;
    }
    
    let date;
    
    // Convert to Gregorian date for calculation
    if (currentCalendar === 'persian') {
        date = persianToGregorian({year, month, day});
    } else {
        date = new Date(year, month - 1, day);
    }
    
    const sunTimes = getSunTimes(currentCity, date);
    const sunriseTime = formatTime(sunTimes.sunrise, currentLang);
    const sunsetTime = formatTime(sunTimes.sunset, currentLang);
    
    // Calculate day duration
    const dayDuration = calculateDayDuration(sunTimes.sunrise, sunTimes.sunset);
    
    // Update the card
    updateSunTimesCard(sunriseTime, sunsetTime, dayDuration, date);
}

/**
 * Loads cities data from JSON file
 */
async function loadCitiesData() {
    try {
        const response = await fetch(`${BASE_PATH}/assets/data/cities.json`);
        cities = await response.json();
        console.log('✅ Cities data loaded successfully');
        
        // Don't initialize city selection here - it will be initialized when settings page loads
        console.log('🏙️ Cities data loaded, city selection will be initialized when needed');
        
        // Update sun times display
        updateSunTimesDisplay();        
    } catch (error) {
        console.error('❌ Error loading cities data:', error);
    }
}

/**
 * Initializes city selection dropdown from cities data
 */
function initializeCitySelection() {
    const citySelect = document.getElementById('citySelect');
    if (!citySelect) {
        console.warn('⚠️ City select element not found - this is normal if not on settings page');
        return;
    }
    
    // Clear existing options
    citySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = currentLang === 'fa' ? 'انتخاب شهر' : 'Select City';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    citySelect.appendChild(defaultOption);
    
    // Add cities to dropdown from loaded data
    Object.keys(cities).forEach(cityId => {
        const city = cities[cityId];
        const option = document.createElement('option');
        option.value = cityId;
        
        // Use bilingual display
        if (currentLang === 'fa') {
            option.textContent = `${city.fa} (${city.en})`;
        } else {
            option.textContent = `${city.en} (${city.fa})`;
        }
        
        option.setAttribute('data-city-id', cityId);
        citySelect.appendChild(option);
    });
    
    // Set current city
    if (cities[currentCity]) {
        citySelect.value = currentCity;
    }
    
    console.log('✅ City selection initialized with', Object.keys(cities).length, 'cities');
}

// ======================= SUNRISE SUNSET TIMES =======================
/**
 * Calculate highly accurate sunrise and sunset times
 * using Jean Meeus algorithm with height correction
 * @param {string} cityId - City ID
 * @param {Date} date - Gregorian date
 * @returns {Object} - {sunrise: Date, sunset: Date}
 */
function getSunTimes(cityId, date) {
    if (!cityId || !cities[cityId]) {
        console.warn(`City "${cityId}" not found, using Tehran as default`);
        cityId = 'tehran';
    }

    const city = cities[cityId];
    const lat = city.lat;
    const lng = city.lon;
    const height = city.height || 0; // in meters

    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;

    // Day of the year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const n = Math.floor(diff / oneDay);

    // Mean longitude of the Sun
    const L0 = (280.46646 + 0.9856474 * n) % 360;

    // Mean anomaly
    const M = (357.52911 + 0.98560028 * n) % 360;

    // Ecliptic longitude
    const C = 1.914602 * Math.sin(rad*M) + 0.019993 * Math.sin(rad*2*M) + 0.000289 * Math.sin(rad*3*M);
    const lambda = L0 + C;

    // Obliquity
    const epsilon = 23.439 - 0.00000036 * n;

    // Declination
    const delta = Math.asin(Math.sin(rad*epsilon) * Math.sin(rad*lambda));

    // Equation of time (in minutes)
    const y = Math.tan(rad*(epsilon/2))**2;
    const EoT = 4*deg*(y*Math.sin(2*rad*L0) - 2*0.0167*Math.sin(rad*M) + 4*0.0167*y*Math.sin(rad*M)*Math.cos(2*rad*L0) - 0.5*y**2*Math.sin(4*rad*L0) - 1.25*0.0167**2*Math.sin(2*rad*M));

    // Zenith correction for refraction and height
    const zenith = (90.833 + 0.0347 * Math.sqrt(height)) * rad;

    // Latitude in radians
    const latRad = lat * rad;

    // Hour angle
    const cosH = (Math.cos(zenith) - Math.sin(latRad)*Math.sin(delta)) / (Math.cos(latRad)*Math.cos(delta));
    if (cosH > 1) return { sunrise: null, sunset: null }; // sun never rises
    if (cosH < -1) return { sunrise: null, sunset: null }; // sun never sets
    const H = Math.acos(cosH); // in radians
    const Hh = H * deg / 15; // in hours

    // Solar noon in local time
    const timezoneOffset = -date.getTimezoneOffset()/60;
    const solarNoon = 12 - (lng/15) - (EoT/60) + timezoneOffset;

    // Sunrise and sunset
    const sunriseHour = solarNoon - Hh;
    const sunsetHour  = solarNoon + Hh;

    const sunrise = new Date(date);
    const sunset = new Date(date);

    sunrise.setHours(Math.floor(sunriseHour), Math.floor((sunriseHour%1)*60), Math.floor((((sunriseHour%1)*60)%1)*60));
    sunset.setHours(Math.floor(sunsetHour), Math.floor((sunsetHour%1)*60), Math.floor((((sunsetHour%1)*60)%1)*60));

    return { sunrise, sunset };
}

// ======================= FOOTER TOGGLE FUNCTIONALITY =======================
/**
 * Initializes footer toggle functionality
 */
function initializeFooterToggle() {
    const footer = document.querySelector('.footer');
    
    if (!footerToggle || !footerContainer) return;
    
    // Load saved state from localStorage - FIXED LOGIC
    const savedState = localStorage.getItem('footerExpanded');
    let isFooterExpanded;
    
    if (savedState === null) {
        // First time user - use default value
        isFooterExpanded = defaultFooterExpanded;
        localStorage.setItem('footerExpanded', isFooterExpanded.toString());
    } else {
        // Returning user - use saved preference
        isFooterExpanded = savedState === 'true';
    }
    
    console.log('Footer state:', { 
        savedState, 
        defaultFooterExpanded, 
        isFooterExpanded 
    });
    
    // Set initial state WITHOUT auto-scroll
    updateFooterState(isFooterExpanded, footerToggle, footerContainer, footer, false);
    
    // Add event listener
    footerToggle.addEventListener('click', () => {
        const currentState = footerToggle.getAttribute('aria-expanded') === 'true';
        const newState = !currentState;
        
        updateFooterState(newState, footerToggle, footerContainer, footer, true);
        localStorage.setItem('footerExpanded', newState.toString());
        
        console.log('Footer toggled to:', newState);
    });
}

/**
 * Updates footer toggle state
 * @param {boolean} isExpanded - Whether footer is expanded
 * @param {HTMLElement} toggleBtn - Toggle button element
 * @param {HTMLElement} container - Footer container element
 * @param {HTMLElement} footer - Footer element
 * @param {boolean} shouldScroll - Whether to scroll to footer (only on user action)
 */
function updateFooterState(isExpanded, toggleBtn, container, footer, shouldScroll = false) {
    if (isExpanded) {
        // Expand footer
        toggleBtn.setAttribute('aria-expanded', 'true');
        container.classList.remove('collapsed');
        container.classList.add('expanded');
        footer.classList.remove('collapsed');
        footer.classList.add('expanded');
        
        // Update button text
        updateFooterToggleText();
        
        // Only scroll when user explicitly clicks the toggle button
        if (shouldScroll) {
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }, 300);
        }
        
    } else {
        // Collapse footer
        toggleBtn.setAttribute('aria-expanded', 'false');
        container.classList.remove('expanded');
        container.classList.add('collapsed');
        footer.classList.remove('expanded');
        footer.classList.add('collapsed');
        
        // Update button text
        updateFooterToggleText();
        
        // Only adjust scroll position when user explicitly collapses
        if (shouldScroll) {
            setTimeout(() => {
                const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
                if (isAtBottom) {
                    window.scrollTo({
                        top: document.body.scrollHeight - window.innerHeight - 100,
                        behavior: 'smooth'
                    });
                }
            }, 300);
        }
    }
}

/**
 * Updates footer toggle tooltip (icon title) based on language
 */
function updateFooterToggleText() {
    if (!footerToggle) return;

    const icon = footerToggle.querySelector('.toggle-icon');
    const isExpanded = footerToggle.getAttribute('aria-expanded') === 'true';
    
    const hideText = langData?.ui?.hideFooter || 'بستن پاورقی';
    const showText = langData?.ui?.showFooter || 'نمایش پاورقی';
    
    if (icon) {
        icon.title = isExpanded ? hideText : showText;
    }
}

// ======================= UI HELPER FUNCTIONS =======================
/**
 * Toggles between Persian and English languages
 */
function toggleLanguage() {
    currentLang = currentLang === 'fa' ? 'en' : 'fa';
    loadLanguage(currentLang);
}

/**
 * Updates UI texts based on language
 * @param {string} lang - Language code
 */
function updateUITexts(lang) {
    document.querySelector('.logo').textContent = langData.ui.logo;
    if (todayBtn) todayBtn.title = langData.ui.today;
    if (prevMonthBtn) prevMonthBtn.title = langData.ui.prevMonth;
    if (nextMonthBtn) nextMonthBtn.title = langData.ui.nextMonth;
    if (prevYearBtn) prevYearBtn.title = langData.ui.prevYear;
    if (nextYearBtn) nextYearBtn.title = langData.ui.nextYear;

    if (modalTitle) modalTitle.textContent = langData.ui.addEvent;
    if (eventTitle) eventTitle.placeholder = langData.ui.eventTitlePlaceholder;
    if (eventDescription) eventDescription.placeholder = langData.ui.eventDescriptionPlaceholder;
    if (cancelEvent) cancelEvent.textContent = langData.ui.cancel;
}

/**
 * Shows toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'var(--primary-color)';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Scrolls to the top of the page with smooth animation
 * Ensures compatibility with both desktop and mobile browsers
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Additional scroll methods for mobile browser compatibility
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

/**
 * Opens external links in the appropriate browser based on PWA detection
 * @param {string} url - The URL to open
 */
function openExternalLink(url) {
    // Check if the app is running in PWA/standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        // In PWA mode - open in system browser
        window.open(url, '_system');
    } else {
        // In normal browser mode - open in new tab
        window.open(url, '_blank');
    }
}

// ======================= UTILITY FUNCTIONS =======================
/**
 * Converts Gregorian date to Persian date
 * @param {Date} gDate - Gregorian date
 * @returns {Object} Persian date object
 */
function gregorianToPersian(date) {
    const jalaaliDate = jalaali.toJalaali(date);
    return {
        year: jalaaliDate.jy,
        month: jalaaliDate.jm,
        day: jalaaliDate.jd
    };
}

/**
 * Converts Persian date to Gregorian date
 * @param {Object} p - Persian date object
 * @returns {Date} Gregorian date
 */
function persianToGregorian(persianDate) {
    const gregorianDate = jalaali.toGregorian(persianDate.year, persianDate.month, persianDate.day);
    return new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd);
}

/**
 * Gets first day of Persian month
 * @param {number} year - Persian year
 * @param {number} month - Persian month
 * @returns {number} Day of week (0-6, 0=Saturday)
 */
function getFirstDayOfPersianMonth(year, month) {
    const firstDayGregorian = persianToGregorian({year: year, month: month, day: 1});
    let dayOfWeek = firstDayGregorian.getDay();
    
    // Convert to Persian week (0 = Saturday, 6 = Friday)
    return (dayOfWeek + 1) % 7;
}

/**
 * Gets number of days in Persian month
 * @param {number} year - Persian year
 * @param {number} month - Persian month
 * @returns {number} Number of days in month
 */
function getDaysInPersianMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    
    return jalaali.isLeapJalaaliYear(year) ? 30 : 29;
}

/**
 * Generates date key for storage
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 * @returns {string} Date key
 */
function getDateKey(year, month, day) {
    return `${year}-${month}-${day}`;
}

// ======================= APPLICATION START =======================
// Initialize the application
initializeApp();
