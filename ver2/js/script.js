document.addEventListener('DOMContentLoaded', function () {
    // Конфигурация API
    const API_BASE_URL = 'http://192.168.1.125:8000/api/v1';
    const DEFAULT_PAGE_SIZE = 12;

    // Элементы DOM
    const elements = {
        searchInput: document.getElementById('search-input'),
        searchButton: document.getElementById('search-button'),
        booksGrid: document.getElementById('books-grid'),
        loadMoreBtn: document.getElementById('load-more'),
        yearFilter: document.getElementById('year'),
        minRatingFilter: document.getElementById('min-rating'),
        categoryLinks: document.querySelectorAll('.category-link'),
        mainLogo: document.getElementById('main-logo'),
        booksList: document.getElementById('books-list'),
        bookDetail: document.getElementById('book-detail'),
        backButton: document.getElementById('back-button'),
        bookDetailCover: document.getElementById('book-detail-cover'),
        bookDetailTitle: document.getElementById('book-detail-title'),
        bookDetailAuthor: document.getElementById('book-detail-author'),
        bookDetailYear: document.getElementById('book-detail-year'),
        bookDetailPages: document.getElementById('book-detail-pages'),
        bookDetailRating: document.getElementById('book-detail-rating'),
        bookDetailLanguage: document.getElementById('book-detail-language'),
        bookDetailIsbn: document.getElementById('book-detail-isbn'),
        bookDetailDescription: document.getElementById('book-detail-description')
    };

    // Состояние приложения
    const state = {
        books: [],
        currentPage: 1,
        loading: false,
        hasMore: true,
        currentQuery: '',
        currentCategory: 'all',
        currentYear: '',
        currentMinRating: '',
        lastResponse: null,
        sortBy: 'rating_desc'
    };

    // Инициализация
    init();

    function init() {
        // Загрузить популярные книги при загрузке
        fetchBooks();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Поиск
        elements.searchButton.addEventListener('click', performSearch);
        elements.searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performSearch();
        });

        // Фильтры
        elements.yearFilter.addEventListener('change', function () {
            state.currentYear = this.value;
            resetAndFetch();
        });

        elements.minRatingFilter.addEventListener('change', function () {
            state.currentMinRating = this.value;
            resetAndFetch();
        });

        // Категории
        elements.categoryLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                setActiveCategory(this);
                filterByCategory(this.dataset.category);
            });
        });

        // Кнопка "Показать еще"
        elements.loadMoreBtn.addEventListener('click', loadMoreBooks);

        // Логотип для возврата на главную
        elements.mainLogo.addEventListener('click', function (e) {
            e.preventDefault();
            showBooksList();
        });

        // Кнопка "Назад" на странице книги
        elements.backButton.addEventListener('click', function (e) {
            e.preventDefault();
            showBooksList();
        });
    }

    // Сброс состояния и повторный запрос
    function resetAndFetch() {
        state.currentPage = 1;
        state.hasMore = true;
        fetchBooks();
    }

    // Установить активную категорию
    function setActiveCategory(activeLink) {
        elements.categoryLinks.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
        state.currentCategory = activeLink.dataset.category;
    }

    // Фильтрация по категории
    function filterByCategory(category) {
        state.currentCategory = category;
        state.currentPage = 1;
        state.hasMore = true;
        fetchBooks();
    }

    // Выполнить поиск
    function performSearch() {
        const query = elements.searchInput.value.trim();
        if (!query) return;

        state.currentQuery = query;
        state.currentPage = 1;
        state.hasMore = true;
        fetchBooks();
    }

    // Загрузить больше книг
    function loadMoreBooks() {
        if (state.loading || !state.hasMore) return;

        state.currentPage++;
        fetchBooks(true);
    }

    // Основная функция для получения книг
    async function fetchBooks(loadMore = false) {
        if (!loadMore) {
            state.books = [];
            renderBooks([]);
        }

        toggleLoading(true);

        try {
            const params = new URLSearchParams();

            // Добавляем параметры запроса
            if (state.currentQuery) params.append('q', state.currentQuery);
            if (state.currentCategory !== 'all') params.append('genre', state.currentCategory);

            // Добавляем фильтры
            if (state.currentYear) {
                params.append('min_year', state.currentYear);
                params.append('max_year', state.currentYear);
            }
            if (state.currentMinRating) params.append('min_rating', state.currentMinRating);

            // Добавляем пагинацию и сортировку
            params.append('page', state.currentPage);
            params.append('page_size', DEFAULT_PAGE_SIZE);
            params.append('sort_by', state.sortBy);

            const response = await fetch(`${API_BASE_URL}/books?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            const data = await response.json();

            state.lastResponse = data;

            if (data.results && data.results.length > 0) {
                const newBooks = processBooksData(data.results);

                if (loadMore) {
                    // Фильтруем дубликаты
                    const existingIds = state.books.map(book => book.id);
                    const uniqueNewBooks = newBooks.filter(book => !existingIds.includes(book.id));

                    state.books = [...state.books, ...uniqueNewBooks];
                } else {
                    state.books = newBooks;
                }

                state.hasMore = (state.currentPage * DEFAULT_PAGE_SIZE) < data.total_hits;
                renderBooks(state.books);
            } else {
                state.hasMore = false;
                if (!loadMore) {
                    renderBooks([]);
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке книг:', error);
            if (!loadMore) {
                renderBooks([]);
            }
        } finally {
            toggleLoading(false);
        }
    }

    // Получить детали книги
    async function fetchBookDetails(bookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
            if (!response.ok) throw new Error('Ошибка при загрузке деталей книги');
            return await response.json();
        } catch (error) {
            console.error('Ошибка:', error);
            return null;
        }
    }

    // Обработка данных книг из API
    function processBooksData(booksData) {
        return booksData.map(bookData => {
            // Получаем авторов
            let authors = 'Неизвестный автор';
            if (bookData.authors && bookData.authors.length > 0) {
                authors = bookData.authors.map(a => a.name).join(', ');
            }

            // Получаем жанры
            let genres = '';
            if (bookData.genres && bookData.genres.length > 0) {
                genres = bookData.genres.map(g => g.name).join(', ');
            }

            // Получаем рейтинг
            let rating = '';
            if (bookData.average_rating) {
                rating = `${bookData.average_rating.toFixed(1)}/10`;
            }

            // Заглушка для обложки
            const placeholderCover = 'https://via.placeholder.com/200x300?text=No+Cover';

            return {
                id: bookData.id,
                title: bookData.title || 'Без названия',
                author: authors,
                year: bookData.year_published || '',
                pages: bookData.book_size_pages ? `${bookData.book_size_pages} стр.` : '',
                rating: rating,
                coverUrl: placeholderCover,
                description: bookData.summary || 'Описание отсутствует',
                language: bookData.language || '',
                isbn: bookData.isbn_13 || '',
                rawData: bookData // Сохраняем исходные данные для детальной страницы
            };
        });
    }

    // Отобразить книги
    function renderBooks(books) {
        if (state.currentPage === 1) {
            elements.booksGrid.innerHTML = '';
        }

        if (books.length === 0 && state.currentPage === 1) {
            elements.booksGrid.innerHTML = '<p class="no-results">Книги не найдены. Попробуйте изменить параметры поиска.</p>';
            elements.loadMoreBtn.style.display = 'none';
            return;
        }

        books.forEach(book => {
            const bookElement = createBookElement(book);
            elements.booksGrid.appendChild(bookElement);

            // Обработчик для клика по карточке
            bookElement.addEventListener('click', async function () {
                // Показываем базовую информацию сразу
                showBookDetail(book);

                // Загружаем дополнительные детали
                const bookDetails = await fetchBookDetails(book.id);
                if (bookDetails) {
                    updateBookDetailWithFullInfo(bookDetails);
                }
            });
        });

        elements.loadMoreBtn.style.display = state.hasMore ? 'block' : 'none';
    }

    // Обновить детальную страницу с полной информацией
    function updateBookDetailWithFullInfo(bookDetails) {
        // Авторы
        const authors = bookDetails.authors.map(a => a.name).join(', ');
        elements.bookDetailAuthor.textContent = authors;

        // Год издания
        if (bookDetails.year_published) {
            elements.bookDetailYear.textContent = `Год: ${bookDetails.year_published}`;
            elements.bookDetailYear.style.display = 'inline-block';
        } else {
            elements.bookDetailYear.style.display = 'none';
        }

        // Страницы
        if (bookDetails.book_size_pages) {
            elements.bookDetailPages.textContent = `${bookDetails.book_size_pages} стр.`;
            elements.bookDetailPages.style.display = 'inline-block';
        } else {
            elements.bookDetailPages.style.display = 'none';
        }

        // Рейтинг
        if (bookDetails.average_rating) {
            elements.bookDetailRating.textContent = `Рейтинг: ${bookDetails.average_rating.toFixed(1)}/10`;
            elements.bookDetailRating.style.display = 'inline-block';
        } else {
            elements.bookDetailRating.style.display = 'none';
        }

        // Язык
        if (bookDetails.language) {
            elements.bookDetailLanguage.textContent = `Язык: ${bookDetails.language}`;
            elements.bookDetailLanguage.style.display = 'inline-block';
        } else {
            elements.bookDetailLanguage.style.display = 'none';
        }

        // ISBN
        if (bookDetails.isbn_13) {
            elements.bookDetailIsbn.textContent = `ISBN: ${bookDetails.isbn_13}`;
            elements.bookDetailIsbn.style.display = 'inline-block';
        } else {
            elements.bookDetailIsbn.style.display = 'none';
        }

        // Описание
        elements.bookDetailDescription.textContent = bookDetails.summary || 'Описание отсутствует';
    }

    // Создать элемент книги
    function createBookElement(book) {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.dataset.id = book.id;

        bookCard.innerHTML = `
            <img src="${book.coverUrl}" alt="Обложка книги ${book.title}" class="book-cover">
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                <div class="book-meta">
                    ${book.year ? `<span>${book.year}</span>` : ''}
                    ${book.rating ? `<span class="book-rating">★ ${book.rating}</span>` : ''}
                </div>
            </div>
        `;

        return bookCard;
    }

    // Показать детальную страницу книги
    function showBookDetail(book) {
        elements.bookDetailCover.src = book.coverUrl;
        elements.bookDetailCover.alt = `Обложка книги ${book.title}`;
        elements.bookDetailTitle.textContent = book.title;
        elements.bookDetailAuthor.textContent = book.author;

        if (book.year) {
            elements.bookDetailYear.textContent = `Год: ${book.year}`;
            elements.bookDetailYear.style.display = 'inline-block';
        } else {
            elements.bookDetailYear.style.display = 'none';
        }

        if (book.pages) {
            elements.bookDetailPages.textContent = book.pages;
            elements.bookDetailPages.style.display = 'inline-block';
        } else {
            elements.bookDetailPages.style.display = 'none';
        }

        if (book.rating) {
            elements.bookDetailRating.textContent = `Рейтинг: ${book.rating}`;
            elements.bookDetailRating.style.display = 'inline-block';
        } else {
            elements.bookDetailRating.style.display = 'none';
        }

        if (book.language) {
            elements.bookDetailLanguage.textContent = `Язык: ${book.language}`;
            elements.bookDetailLanguage.style.display = 'inline-block';
        } else {
            elements.bookDetailLanguage.style.display = 'none';
        }

        if (book.isbn) {
            elements.bookDetailIsbn.textContent = `ISBN: ${book.isbn}`;
            elements.bookDetailIsbn.style.display = 'inline-block';
        } else {
            elements.bookDetailIsbn.style.display = 'none';
        }

        elements.bookDetailDescription.textContent = book.description;

        // Переключаем отображение
        elements.booksList.style.display = 'none';
        elements.bookDetail.classList.add('active');

        // Прокручиваем к верху страницы
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Показать список книг
    function showBooksList() {
        elements.bookDetail.classList.remove('active');
        elements.booksList.style.display = 'block';
    }

    // Переключение состояния загрузки
    function toggleLoading(isLoading) {
        state.loading = isLoading;

        if (isLoading) {
            elements.loadMoreBtn.classList.add('loading');
        } else {
            elements.loadMoreBtn.classList.remove('loading');
        }
    }
});