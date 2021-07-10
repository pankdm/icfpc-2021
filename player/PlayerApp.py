#!/usr/bin/env python

from kivy.config import Config
Config.set('graphics', 'resizable', True)

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.widget import Widget
from kivy.properties import ObjectProperty
from kivy.uix.popup import Popup
from kivy.graphics import *

from itertools import chain

import json
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
    model = ObjectProperty(None)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.bind(pos=self._update_canvas)
        self.bind(size=self._update_canvas)
        self.bind(model=self._update_canvas)

    def _update_canvas(self, instance, value):
        self.canvas.clear()
        if self.model:
            points = self.model['hole'] + self.model['figure']['vertices']
            self._min_x = min(p[0] for p in points)
            self._max_x = max(p[0] for p in points)
            self._min_y = min(p[1] for p in points)
            self._max_y = max(p[1] for p in points)
            self._width = max((self._max_x - self._min_x) * 1.2, 1)
            self._height = max((self._max_y - self._min_y) * 1.2, 1)

            scale = min(self.width / self._width, self.height / self._height)

            hole = list(chain(*self.model['hole']))
            vertices = self.model['figure']['vertices']

            with self.canvas:
                PushMatrix()
                Translate(0, self.y)
                Scale(scale, -scale, 1)
                Translate(0, -self._height)
                Color(1, 0, 0)
                Line(points=hole, close=True)
                Color(0, 1, 0)
                for (i, j) in self.model['figure']['edges']:
                    Line(points=vertices[i] + vertices[j])
                PopMatrix()


class Player(BoxLayout):
    loadfile = ObjectProperty(None)
    savefile = ObjectProperty(None)
    field = ObjectProperty(None)
    
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
        with open(os.path.join(path, filename)) as stream:
            self.field.model = json.load(stream)
        self.dismiss_popup()

    def save(self, path, filename):
        print(os.path.join(path, filename))
        self.dismiss_popup()


class PlayerApp(App):
    def build(self):
        return Player()


if __name__ == '__main__':
    PlayerApp().run()