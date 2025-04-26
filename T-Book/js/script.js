// Переменные состояния
let currentPage = 1;
const booksPerPage = 8;
let allBooks = [];
let filteredBooks = [];
let displayedBookIds = new Set();
let searchQuery = '';
let currentFilters = {
    genre: '',
    yearFrom: '',
    yearTo: '',
    rating: '',
    sortBy: 'relevance'
};

// DOM элементы
const booksGrid = document.getElementById('booksGrid');
const loadMoreBtn = document.getElementById('loadMore');
const moreBooksNotification = document.getElementById('moreBooksNotification');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');
const genreFilter = document.getElementById('genreFilter');
const yearFrom = document.getElementById('yearFrom');
const yearTo = document.getElementById('yearTo');
const ratingFilter = document.getElementById('ratingFilter');
const sortBy = document.getElementById('sortBy');
const applyFilters = document.getElementById('applyFilters');

// Инициализация
fetchBooks();

// События
searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

filterBtn.addEventListener('click', () => {
    filterDropdown.classList.toggle('show');
});

applyFilters.addEventListener('click', () => {
    currentFilters = {
        genre: genreFilter.value,
        yearFrom: yearFrom.value,
        yearTo: yearTo.value,
        rating: ratingFilter.value,
        sortBy: sortBy.value
    };

    currentPage = 1;
    displayedBookIds.clear();
    filterBooks();
    renderBooks();
    filterDropdown.classList.remove('show');
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    renderBooks(true);
});

// Функции
async function fetchBooks() {
    try {
        // Используем Open Library API для получения книг
        const response = await fetch('https://openlibrary.org/search.json?q=subject:fiction&limit=100');
        const data = await response.json();

        if (data && data.docs) {
            allBooks = data.docs.map((book, index) => {
                // Создаем объект книги в нужном формате
                return {
                    id: book.key || `book-${index}`,
                    title: book.title || 'Неизвестное название',
                    author: book.author_name ? book.author_name.join(', ') : 'Неизвестный автор',
                    year: book.first_publish_year || 1900,
                    genre: getRandomGenre(),
                    rating: (Math.random() * 2 + 3).toFixed(1), // Рейтинг от 3 до 5
                    description: book.description ?
                        (typeof book.description === 'string' ? book.description : book.description.value || 'Описание отсутствует') :
                        'Описание отсутствует',
                    coverUrl: book.cover_i ?
                        `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` :
                        ''
                };
            });

            filterBooks();
            renderBooks();
        }
    } catch (error) {
        console.error('Ошибка при загрузке книг:', error);
        booksGrid.innerHTML = '<div class="no-results">Не удалось загрузить книги. Пожалуйста, попробуйте позже.</div>';
    }
}

function getRandomGenre() {
    const genres = ['fantasy', 'sci-fi', 'romance', 'mystery', 'horror', 'biography'];
    return genres[Math.floor(Math.random() * genres.length)];
}

function performSearch() {
    searchQuery = searchInput.value.toLowerCase();
    currentPage = 1;
    displayedBookIds.clear();
    filterBooks();
    renderBooks();
}

function filterBooks() {
    filteredBooks = allBooks.filter(book => {
        // Поиск по названию или автору
        const matchesSearch = searchQuery === '' ||
            book.title.toLowerCase().includes(searchQuery) ||
            book.author.toLowerCase().includes(searchQuery);

        // Фильтр по жанру
        const matchesGenre = currentFilters.genre === '' ||
            book.genre === currentFilters.genre;

        // Фильтр по году
        const matchesYear = (
            (currentFilters.yearFrom === '' || book.year >= parseInt(currentFilters.yearFrom)) &&
            (currentFilters.yearTo === '' || book.year <= parseInt(currentFilters.yearTo))
        );

        // Фильтр по рейтингу
        const matchesRating = currentFilters.rating === '' ||
            parseFloat(book.rating) >= parseFloat(currentFilters.rating);

        return matchesSearch && matchesGenre && matchesYear && matchesRating;
    });

    // Сортировка
    sortBooks();
}

function sortBooks() {
    switch (currentFilters.sortBy) {
        case 'title':
            filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title-desc':
            filteredBooks.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'year':
            filteredBooks.sort((a, b) => b.year - a.year);
            break;
        case 'year-desc':
            filteredBooks.sort((a, b) => a.year - b.year);
            break;
        case 'rating':
            filteredBooks.sort((a, b) => b.rating - a.rating);
            break;
        case 'rating-desc':
            filteredBooks.sort((a, b) => a.rating - b.rating);
            break;
        default:
            // По релевантности (поисковый запрос)
            if (searchQuery) {
                filteredBooks.sort((a, b) => {
                    const aTitleMatch = a.title.toLowerCase().includes(searchQuery);
                    const bTitleMatch = b.title.toLowerCase().includes(searchQuery);

                    if (aTitleMatch && !bTitleMatch) return -1;
                    if (!aTitleMatch && bTitleMatch) return 1;

                    const aAuthorMatch = a.author.toLowerCase().includes(searchQuery);
                    const bAuthorMatch = b.author.toLowerCase().includes(searchQuery);

                    if (aAuthorMatch && !bAuthorMatch) return -1;
                    if (!aAuthorMatch && bAuthorMatch) return 1;

                    return 0;
                });
            }
    }
}

function renderBooks(showNotification = false) {
    const startIndex = 0;
    const endIndex = currentPage * booksPerPage;
    const booksToDisplay = filteredBooks.filter(book => !displayedBookIds.has(book.id));

    if (currentPage === 1) {
        booksGrid.innerHTML = '';
        displayedBookIds.clear();
    }

    if (filteredBooks.length === 0 && currentPage === 1) {
        booksGrid.innerHTML = '<div class="no-results">Ничего не найдено. Попробуйте изменить параметры поиска.</div>';
        loadMoreBtn.style.display = 'none';
        moreBooksNotification.style.display = 'none';
        return;
    }

    if (showNotification && booksToDisplay.length > 0) {
        moreBooksNotification.style.display = 'block';
    } else {
        moreBooksNotification.style.display = 'none';
    }

    // Ограничиваем количество книг для отображения на текущей странице
    const booksForCurrentPage = booksToDisplay.slice(0, booksPerPage);

    booksForCurrentPage.forEach(book => {
        displayedBookIds.add(book.id);

        const bookElement = document.createElement('div');
        bookElement.className = 'book-card';
        bookElement.innerHTML = `
            <div class="book-cover" style="background-image: url('${book.coverUrl}')">
                ${!book.coverUrl ? book.title.substring(0, 2) : ''}
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
                <div class="book-year">${book.year} год</div>
                <div class="book-description">${book.description}</div>
            </div>
        `;
        booksGrid.appendChild(bookElement);
    });

    // Проверяем, есть ли еще книги для отображения
    const hasMoreBooks = filteredBooks.some(book => !displayedBookIds.has(book.id));

    if (hasMoreBooks) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
        if (currentPage > 1) {
            moreBooksNotification.textContent = 'Книги загружены';
            moreBooksNotification.style.display = 'block';
        }
    }
}

// Закрытие фильтров при клике вне их
document.addEventListener('click', (e) => {
    if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.remove('show');
    }
});