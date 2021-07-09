#!/usr/bin/env python

from kivy.config import Config
Config.set('graphics', 'resizable', True)

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.widget import Widget
from kivy.properties import ObjectProperty
from kivy.uix.popup import Popup
from kivy.graphics import *

import os

class LoadDialog(BoxLayout):
    load = ObjectProperty(None)
    cancel = ObjectProperty(None)


class SaveDialog(BoxLayout):
    save = ObjectProperty(None)
    filename = ObjectProperty(None)
    cancel = ObjectProperty(None)

    def update_name(self, selection):
        self.filename.text = selection and selection[0] and os.path.basename(selection[0]) or ''


class Field(Widget):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.bind(size=self._update_canvas)

    def _update_canvas(self, instance, value):
        self.canvas.clear()


class Player(BoxLayout):
    loadfile = ObjectProperty(None)
    savefile = ObjectProperty(None)
    field = ObjectProperty(None)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def dismiss_popup(self):
        self._popup.dismiss()

    def show_load(self):
        content = LoadDialog(load=self.load, cancel=self.dismiss_popup)
        self._popup = Popup(title="Load file", content=content, size_hint=(0.9, 0.9))
        self._popup.open()

    def show_save(self):
        content = SaveDialog(save=self.save, cancel=self.dismiss_popup)
        self._popup = Popup(title="Save file", content=content, size_hint=(0.9, 0.9))
        self._popup.open()

    def load(self, path, filename):
        print(os.path.join(path, filename))
        self.dismiss_popup()

    def save(self, path, filename):
        print(os.path.join(path, filename))
        self.dismiss_popup()


class PlayerApp(App):
    def build(self):
        return Player()


if __name__ == '__main__':
    PlayerApp().run()