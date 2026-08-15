import React, { useState, useMemo } from 'react';
import { Book } from '../services/api';
import { BookOpen, Search, X, Heart } from 'lucide-react';
import { storage } from '../services/storage';

interface BookListProps {
  books: Book[];
  onSelectBook: (bookId: string) => void;
  isLoading: boolean;
}

export const BookList: React.FC<BookListProps> = ({ books, onSelectBook, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SHELF'>('ALL');
  const [shelfBooks, setShelfBooks] = useState<string[]>(storage.getShelf());

  const toggleShelf = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    storage.toggleShelf(bookId);
    setShelfBooks(storage.getShelf());
  };

  const allClasses = useMemo(() => {
    const classes = new Set<string>();
    books.forEach(b => { if (b.displayClass) classes.add(b.displayClass); });
    return Array.from(classes).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      if (activeTab === 'SHELF' && !shelfBooks.includes(b._id)) return false;
      const matchesSearch = !searchQuery || (b.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !classFilter || b.displayClass === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [books, searchQuery, classFilter, activeTab, shelfBooks]);

  if (isLoading) {
    return <div className="spinner"></div>;
  }

  if (books.length === 0) {
    return <div className="text-center mt-8 text-muted">No books available at the moment.</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>Library</h1>
          <p className="page-subtitle">Select a book to start learning</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-light)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn ${activeTab === 'ALL' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', boxShadow: activeTab === 'ALL' ? 'var(--shadow-sm)' : 'none', background: activeTab === 'ALL' ? 'var(--primary)' : 'transparent', color: activeTab === 'ALL' ? 'white' : 'var(--text-main)', border: 'none' }}
            onClick={() => setActiveTab('ALL')}
          >
            All Books
          </button>
          <button 
            className={`btn ${activeTab === 'SHELF' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', boxShadow: activeTab === 'SHELF' ? 'var(--shadow-sm)' : 'none', background: activeTab === 'SHELF' ? 'var(--primary)' : 'transparent', color: activeTab === 'SHELF' ? 'white' : 'var(--text-main)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => setActiveTab('SHELF')}
          >
            <Heart size={14} fill={activeTab === 'SHELF' ? 'white' : 'none'} /> My Shelf
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="search-clear"><X size={16} /></button>
          )}
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="class-filter"
        >
          <option value="">All Classes</option>
          {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          No books found matching your search.
        </div>
      ) : (
        <div className="grid-auto-fill">
          {filteredBooks.map((book) => (
            <div key={book._id} className="card" onClick={() => onSelectBook(book._id)} style={{ cursor: 'pointer', position: 'relative' }}>
              <div 
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.4rem', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 2, display: 'flex' }}
                onClick={(e) => toggleShelf(e, book._id)}
              >
                <Heart size={18} color={shelfBooks.includes(book._id) ? '#ef4444' : '#64748b'} fill={shelfBooks.includes(book._id) ? '#ef4444' : 'none'} />
              </div>
              {book.coverImage?.fullUrl ? (
                <img
                  src={book.coverImage.fullUrl}
                  alt={book.title || 'Book cover'}
                  className="book-cover"
                />
              ) : (
                <div className="book-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={48} color="var(--text-muted)" />
                </div>
              )}
              <div className="book-info">
                <div className="book-meta">
                  {book.displayClass && <span className="badge">{book.displayClass}</span>}
                </div>
                <h3 className="book-title">{book.title || 'Untitled Book'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{book.author || 'PW'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
