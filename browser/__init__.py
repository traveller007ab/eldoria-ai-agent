"""
Eldoria Browser Package

A full-featured browser using PyQt5 and QtWebEngine.
Provides native browser capabilities for the Eldoria AI Agent desktop app.
"""

from .eldoria_browser import EldoriaBrowser, BrowserTab, TabManager

__version__ = "1.0.0"
__all__ = ["EldoriaBrowser", "BrowserTab", "TabManager"]
