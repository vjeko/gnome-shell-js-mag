from libinput import Device, LibInput
from libinput.constant import Event
from libinput.event import PointerAxis, KeyState, Key

import os

current = float(os.popen('/usr/bin/dconf read /org/gnome/desktop/a11y/magnifier/mag-factor').read())
modifier = False

def on_scroll(x, y, dx, dy):
    global current
    global modifier
    if not modifier: return
    if dy < 0: current -= 0.25
    else: current += 0.25

    if current < 1.0: current = 1.0
    myCmd = ('/usr/bin/dconf write /org/gnome/desktop/a11y/magnifier/mag-factor %f' % current)
    os.system(myCmd)

def on_press(key):
    global modifier
    if key == Key.KEY_LEFTSHIFT:
        modifier = True

def on_release(key):
    global modifier
    if key == Key.KEY_LEFTSHIFT:
        modifier = False

li = LibInput()
device = li.path_add_device('/dev/input/event1')
device2 = li.path_add_device('/dev/input/event3')

os.system("dconf write /org/gnome/desktop/a11y/magnifier/mag-factor 2.0000")

for event in li.get_event():
    if event.type == Event.POINTER_AXIS:
        pointer_event = event.get_pointer_event()
        on_scroll(0, 0, 0,
                  -pointer_event.get_axis_value(PointerAxis.SCROLL_VERTICAL))
    if event.type == Event.KEYBOARD_KEY:
        keyboard_event = event.get_keyboard_event()
        if (keyboard_event.get_key_state() == KeyState.PRESSED):
            on_press(keyboard_event.get_key())
        if (keyboard_event.get_key_state() == KeyState.RELEASED):
            on_release(keyboard_event.get_key())
