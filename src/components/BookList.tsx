import React, { useState, useMemo, useRef } from 'react';
import { Book, api } from '../services/api';
import { BookOpen, Search, X, Heart, UploadCloud, Download, CheckCircle, Trash2 } from 'lucide-react';
import { storage } from '../services/storage';
import { pwxPackageManager } from '../services/pwxPackageManager';
import { pwxStorage } from '../services/pwxStorage';

interface BookListProps {
  books: Book[];
  onSelectBook: (bookId: string) => void;
  isLoading: boolean;
  onRefreshBooks?: () => void;
}

export const BookList: React.FC<BookListProps> = ({ books, onSelectBook, isLoading, onRefreshBooks }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SHELF' | 'IMPORTED'>('ALL');
  const [shelfBooks, setShelfBooks] = useState<string[]>(storage.getShelf());

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Exporting state per book
  const [exportingBookId, setExportingBookId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  const toggleShelf = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    storage.toggleShelf(bookId);
    setShelfBooks(storage.getShelf());
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be chosen again
    e.target.value = '';

    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportStatus('Starting import...');
      setNotification(null);

      const result = await pwxPackageManager.importPwxFile(file, (percent, status) => {
        setImportProgress(percent);
        setImportStatus(status);
      });

      setNotification({
        type: 'success',
        message: `Successfully imported "${result.book.title}" with ${result.exercisesCount} exercises!`
      });

      onRefreshBooks?.();
      setActiveTab('IMPORTED');
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to import .pwx file.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteImported = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (!window.confirm(`Delete imported data for "${book.title}" from local storage?`)) return;

    try {
      await pwxStorage.deleteImportedBook(book._id);
      setNotification({
        type: 'success',
        message: `Removed "${book.title}" from offline storage.`
      });
      onRefreshBooks?.();
    } catch (err: any) {
      alert('Failed to remove book: ' + err.message);
    }
  };

  const handleExportBook = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (exportingBookId) return;

    try {
      setExportingBookId(book._id);
      setExportProgress(0);

      const chapters = await api.getChapters(book._id);
      await pwxPackageManager.exportBookAsPwx(book, chapters, (percent) => {
        setExportProgress(percent);
      });

      setNotification({
        type: 'success',
        message: `Exported "${book.title}" as .pwx file!`
      });
    } catch (err: any) {
      alert('Failed to export .pwx: ' + err.message);
    } finally {
      setExportingBookId(null);
      setExportProgress(0);
    }
  };

  const allClasses = useMemo(() => {
    const classes = new Set<string>();
    books.forEach(b => { if (b.displayClass) classes.add(b.displayClass); });
    return Array.from(classes).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      if (activeTab === 'SHELF' && !shelfBooks.includes(b._id)) return false;
      if (activeTab === 'IMPORTED' && !b.isImported) return false;
      const matchesSearch = !searchQuery || (b.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !classFilter || b.displayClass === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [books, searchQuery, classFilter, activeTab, shelfBooks]);

  const importedCount = useMemo(() => books.filter(b => b.isImported).length, [books]);

  if (isLoading) {
    return <div className="spinner"></div>;
  }

  if (books.length === 0) {
    return <div className="text-center mt-8 text-muted">No books available at the moment.</div>;
  }

  return (
    <div>
      {/* Hidden file input for .pwx import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pwx,.zip"
        style={{ display: 'none' }}
      />

      {/* Header bar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>Library</h1>
          <p className="page-subtitle">Browse books or import offline .pwx packages</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Import .pwx button */}
          <button
            className="btn btn-primary"
            onClick={handleImportClick}
            disabled={isImporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <UploadCloud size={16} /> Import .pwx Book
          </button>

          {/* Navigation Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-light)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn ${activeTab === 'ALL' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', boxShadow: activeTab === 'ALL' ? 'var(--shadow-sm)' : 'none', background: activeTab === 'ALL' ? 'var(--primary)' : 'transparent', color: activeTab === 'ALL' ? 'white' : 'var(--text-main)', border: 'none' }}
              onClick={() => setActiveTab('ALL')}
            >
              All Books
            </button>
            <button 
              className={`btn ${activeTab === 'SHELF' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', boxShadow: activeTab === 'SHELF' ? 'var(--shadow-sm)' : 'none', background: activeTab === 'SHELF' ? 'var(--primary)' : 'transparent', color: activeTab === 'SHELF' ? 'white' : 'var(--text-main)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => setActiveTab('SHELF')}
            >
              <Heart size={14} fill={activeTab === 'SHELF' ? 'white' : 'none'} /> My Shelf
            </button>
            <button 
              className={`btn ${activeTab === 'IMPORTED' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', boxShadow: activeTab === 'IMPORTED' ? 'var(--shadow-sm)' : 'none', background: activeTab === 'IMPORTED' ? 'var(--primary)' : 'transparent', color: activeTab === 'IMPORTED' ? 'white' : 'var(--text-main)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => setActiveTab('IMPORTED')}
            >
              <CheckCircle size={14} /> Offline ({importedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Import Progress Banner */}
      {isImporting && (
        <div style={{ background: 'var(--bg-light)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>{importStatus}</span>
            <span>{importProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${importProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }} />
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          background: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: notification.type === 'success' ? '#15803d' : '#b91c1c',
          border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

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
          {activeTab === 'IMPORTED' 
            ? 'No .pwx books imported yet. Click "Import .pwx Book" to add one offline!' 
            : 'No books found matching your search.'}
        </div>
      ) : (
        <div className="grid-auto-fill">
          {filteredBooks.map((book) => {
            const isCurrentlyExporting = exportingBookId === book._id;

            return (
              <div key={book._id} className="card" onClick={() => onSelectBook(book._id)} style={{ cursor: 'pointer', position: 'relative' }}>
                {/* Actions at top right */}
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.4rem', zIndex: 2 }}>
                  {/* Delete button for imported books */}
                  {book.isImported && (
                    <div 
                      style={{ background: 'rgba(255,255,255,0.95)', padding: '0.4rem', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex' }}
                      title="Remove from offline storage"
                      onClick={(e) => handleDeleteImported(e, book)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </div>
                  )}

                  {/* Export .pwx button */}
                  <div 
                    style={{ background: 'rgba(255,255,255,0.95)', padding: '0.4rem', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex' }}
                    title="Export as .pwx"
                    onClick={(e) => handleExportBook(e, book)}
                  >
                    <Download size={16} color={isCurrentlyExporting ? 'var(--primary)' : '#64748b'} />
                  </div>

                  {/* Shelf Heart */}
                  <div 
                    style={{ background: 'rgba(255,255,255,0.95)', padding: '0.4rem', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex' }}
                    onClick={(e) => toggleShelf(e, book._id)}
                    title={shelfBooks.includes(book._id) ? "Remove from Shelf" : "Add to Shelf"}
                  >
                    <Heart size={16} color={shelfBooks.includes(book._id) ? '#ef4444' : '#64748b'} fill={shelfBooks.includes(book._id) ? '#ef4444' : 'none'} />
                  </div>
                </div>

                {/* Cover Image */}
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

                {/* Export Progress overlay */}
                {isCurrentlyExporting && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: 'var(--radius-lg)', zIndex: 10 }}>
                    <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '28px', height: '28px' }}></div>
                    <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>Exporting {exportProgress}%</span>
                  </div>
                )}

                <div className="book-info">
                  <div className="book-meta" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {book.displayClass && <span className="badge">{book.displayClass}</span>}
                    {book.isImported && (
                      <span className="badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle size={10} /> .pwx Offline
                      </span>
                    )}
                  </div>
                  <h3 className="book-title">{book.title || 'Untitled Book'}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{book.author || 'PW'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
