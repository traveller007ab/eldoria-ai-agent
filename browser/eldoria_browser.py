"""
PyQt5 Browser Widget for Eldoria AI Agent

A full-featured browser widget using QtWebEngine (Chromium-based).
Provides native browser capabilities for the desktop app.
"""

import sys
from typing import Optional, Callable
from PyQt5.QtCore import QUrl, Qt, pyqtSignal, QObject
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, 
                              QPushButton, QProgressBar, QToolBar, QAction,
                              QTabWidget, QTabBar, QMenu, QMessageBox)
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage, QWebEngineProfile


class WebEnginePage(QWebEnginePage):
    """Custom web engine page for additional features."""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._permission_requests = {}
        
    def acceptNavigationRequest(self, url, nav_type, is_main_frame):
        """Handle navigation requests."""
        if nav_type == QWebEnginePage.NavigationTypeTyped:
            # User typed URL - always allow
            return True
        elif nav_type == QWebEnginePage.NavigationTypeLinkClicked:
            # Link clicked - check if same origin
            return True
        return super().acceptNavigationRequest(url, nav_type, is_main_frame)


class BrowserTab(QWidget):
    """Browser tab widget containing a web view."""
    
    title_changed = pyqtSignal(str)
    url_changed = pyqtSignal(str)
    loading_changed = pyqtSignal(bool)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximumHeight(3)
        self.progress_bar.setTextVisible(False)
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                border: none;
                background: transparent;
            }
            QProgressBar::chunk {
                background: #22d3ee;
            }
        """)
        layout.addWidget(self.progress_bar)
        
        # Web view
        self.web_view = QWebEngineView()
        self.web_view.setPage(WebEnginePage(self.web_view))
        
        # Connect signals
        self.web_view.titleChanged.connect(self.title_changed.emit)
        self.web_view.urlChanged.connect(self._on_url_changed)
        self.web_view.loadProgress.connect(self.progress_bar.setValue)
        self.web_view.loadFinished.connect(self._on_load_finished)
        
        layout.addWidget(self.web_view)
        self.setLayout(layout)
        
    def _on_url_changed(self, url):
        self.url_changed.emit(url.toString())
        
    def _on_load_finished(self, ok):
        self.loading_changed.emit(not ok)  # inverted - loading when starts
        if ok:
            self.progress_bar.setValue(100)
        else:
            self.progress_bar.hide()
            
    def navigate(self, url: str):
        """Navigate to URL."""
        if not url.startswith('http'):
            url = 'https://' + url
        self.web_view.setUrl(QUrl(url))
        
    def reload(self):
        """Reload page."""
        self.web_view.reload()
        
    def go_back(self):
        """Go back in history."""
        self.web_view.back()
        
    def go_forward(self):
        """Go forward in history."""
        self.web_view.forward()
        
    def stop(self):
        """Stop loading."""
        self.web_view.stop()
        
    def get_url(self) -> str:
        """Get current URL."""
        return self.web_view.url().toString()
        
    def get_title(self) -> str:
        """Get page title."""
        return self.web_view.title()
    
    def inject_script(self, script: str):
        """Inject JavaScript into the page."""
        self.web_view.page().runJavaScript(script)
        
    def extract_text(self) -> str:
        """Extract all text from the page."""
        self.web_view.page().runJavaScript("document.body.innerText", lambda r: None)


class TabManager(QTabWidget):
    """Tabbed browser interface."""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setTabsClosable(True)
        self.tabCloseRequested.connect(self.close_tab)
        self.currentChanged.connect(self._on_tab_changed)
        
    def add_new_tab(self, url: str = "about:blank") -> BrowserTab:
        """Add a new tab and return it."""
        tab = BrowserTab()
        tab_index = self.addTab(tab, "New Tab")
        self.setCurrentIndex(tab_index)
        
        # Connect tab signals
        tab.title_changed.connect(self._update_tab_title)
        tab.url_changed.connect(self._on_url_changed)
        tab.loading_changed.connect(self._on_loading_changed)
        
        if url != "about:blank":
            tab.navigate(url)
            
        return tab
        
    def close_tab(self, index: int):
        """Close tab at index."""
        if self.count() > 1:
            self.removeTab(index)
        else:
            # Don't close last tab, just navigate to blank
            current = self.currentWidget()
            if current:
                current.navigate("about:blank")
                
    def get_current_tab(self) -> Optional[BrowserTab]:
        """Get current active tab."""
        return self.currentWidget()
        
    def _update_tab_title(self, title: str):
        """Update tab title when page title changes."""
        index = self.currentIndex()
        if index >= 0:
            self.setTabText(index, title[:20] + "..." if len(title) > 20 else title)
            
    def _on_url_changed(self, url: str):
        """Handle URL change in current tab."""
        pass  # Emit to parent if needed
        
    def _on_loading_changed(self, loading: bool):
        """Handle loading state change."""
        pass  # Emit to parent if needed


class EldoriaBrowser(QWidget):
    """
    Main browser widget combining tab manager with navigation controls.
    """
    
    # Signals
    on_url_change = pyqtSignal(str)
    on_title_change = pyqtSignal(str)
    on_navigate_request = pyqtSignal(str)  # From PWA via IPC
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_connections()
        
    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Navigation toolbar
        nav_bar = QToolBar()
        nav_bar.setMovable(False)
        nav_bar.setStyleSheet("""
            QToolBar {
                background: #1e293b;
                border-bottom: 1px solid #334155;
                spacing: 4px;
                padding: 4px;
            }
            QToolButton {
                background: transparent;
                border: none;
                border-radius: 4px;
                padding: 6px;
                color: #94a3b8;
            }
            QToolButton:hover {
                background: #334155;
                color: #e2e8f0;
            }
            QToolButton:pressed {
                background: #475569;
            }
        """)
        
        # Back button
        self.btn_back = QPushButton("←")
        self.btn_back.setFixedSize(36, 32)
        self.btn_back.clicked.connect(self._go_back)
        nav_bar.addWidget(self.btn_back)
        
        # Forward button
        self.btn_forward = QPushButton("→")
        self.btn_forward.setFixedSize(36, 32)
        self.btn_forward.clicked.connect(self._go_forward)
        nav_bar.addWidget(self.btn_forward)
        
        # Reload button
        self.btn_reload = QPushButton("↻")
        self.btn_reload.setFixedSize(36, 32)
        self.btn_reload.clicked.connect(self._reload)
        nav_bar.addWidget(self.btn_reload)
        
        # Address bar
        self.url_bar = QLineEdit()
        self.url_bar.setPlaceholderText("Enter URL or search...")
        self.url_bar.setStyleSheet("""
            QLineEdit {
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 6px;
                padding: 8px 12px;
                color: #e2e8f0;
                font-size: 14px;
            }
            QLineEdit:focus {
                border-color: #22d3ee;
            }
        """)
        self.url_bar.returnPressed.connect(self._navigate_from_bar)
        nav_bar.addWidget(self.url_bar)
        
        # Add tab button
        self.btn_new_tab = QPushButton("+")
        self.btn_new_tab.setFixedSize(32, 32)
        self.btn_new_tab.clicked.connect(self._add_new_tab)
        nav_bar.addWidget(self.btn_new_tab)
        
        layout.addWidget(nav_bar)
        
        # Tab manager
        self.tabs = TabManager()
        layout.addWidget(self.tabs)
        
        # Add initial tab
        self.tabs.add_new_tab()
        
        self.setLayout(layout)
        
    def setup_connections(self):
        """Connect signals to slots."""
        pass  # Already connected in setup_ui
        
    def _go_back(self):
        """Go back in current tab."""
        tab = self.tabs.get_current_tab()
        if tab:
            tab.go_back()
            
    def _go_forward(self):
        """Go forward in current tab."""
        tab = self.tabs.get_current_tab()
        if tab:
            tab.go_forward()
            
    def _reload(self):
        """Reload current tab."""
        tab = self.tabs.get_current_tab()
        if tab:
            tab.reload()
            
    def _navigate_from_bar(self):
        """Navigate to URL from address bar."""
        url = self.url_bar.text().strip()
        if url:
            self.navigate(url)
            
    def _add_new_tab(self, url: str = "about:blank"):
        """Add a new tab."""
        self.tabs.add_new_tab(url)
        
    def navigate(self, url: str):
        """Navigate current tab to URL."""
        tab = self.tabs.get_current_tab()
        if tab:
            tab.navigate(url)
            self.url_bar.setText(url)
            
    def navigate_from_pwa(self, url: str):
        """Navigate from PWA IPC request."""
        self._add_new_tab(url)
        self.tabs.setCurrentIndex(self.tabs.count() - 1)
        
    def get_current_url(self) -> str:
        """Get current tab URL."""
        tab = self.tabs.get_current_tab()
        return tab.get_url() if tab else ""
        
    def get_current_title(self) -> str:
        """Get current tab title."""
        tab = self.tabs.get_current_tab()
        return tab.get_title() if tab else ""


if __name__ == "__main__":
    from PyQt5.QtWidgets import QApplication
    from PyQt5.QtCore import QCoreApplication
    
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    browser = EldoriaBrowser()
    browser.resize(1200, 800)
    browser.show()
    
    sys.exit(app.exec_())
