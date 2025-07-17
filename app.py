import json
from ntpath import exists
from sys import setrecursionlimit
from bson import ObjectId
from bson.binary import USER_DEFINED_SUBTYPE
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug import Client
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import string, random, os, re
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'secret_key')

MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/url_shortener')
client = MongoClient(MONGO_URI)
db = client.url_shortener
users_collection = db.users
urls_collection = db.urls

BASE_URL = 'https://sinn.onrender.com/'

def generate_short_code():
    characters = string.ascii_letters + string.digits
    while True:
        code = ''.join(random.choice(characters) for _ in range(6))
        if not urls_collection.find_one({"short_code": code}):
            return code

def is_valid_url(url):
    url_pattern = re.compile(
        r'https?://'
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
        r'localhost|'
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        r'(?::\d+)?'
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )
    return url_pattern.match(url) is not None

@app.route('/')
def home():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_urls = list(urls_collection.find({"user_id": session['user_id']}).sort("created_at", -1))
    return render_template('home.html', urls=user_urls)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if users_collection.find_one({"Username": username}):
            flash('Username already exist.')
            return render_template('register.html')

        hashed_password = generate_password_hash(password)
        user_id = users_collection.insert_one({
            "username": username,
            "password_hash": hashed_password,
            "created_at": datetime.utcnow()
        }).inserted_id

        session['user_id'] = str(user_id)
        session['username'] = username
        flash('Registration Successful!')
        return redirect(url_for('home'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = users_collection.find_one({"username": username})
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = str(user['_id'])
            session['username'] = username
            flash('Login successful!')
            return redirect(url_for('home'))
        else:
            flash('Invalid username or password')

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have logged out!')
    return redirect(url_for('login'))

@app.route('/create', methods=['GET', 'POST'])
def create_short_url():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    original_url = request.form['url']

    if not original_url.startswith(('http://', 'https://')):
        original_url = 'https://' + original_url

    if not is_valid_url(original_url):
        return jsonify({'error': 'Invalid URL'}), 400

    existing_url = urls_collection.find_one({
        "user_id": session['user_id'],
        "original_url": original_url
    })

    if existing_url:
        return jsonify({'error': 'URL already exists in your collection'}), 400

    short_code = generate_short_code()
    urls_collection.insert_one({
        "user_id": session['user_id'],
        "original_url": original_url,
        "short_code": short_code,
        "clicks": 0,
        "created_at": datetime.utcnow()
    })

    short_url = BASE_URL.rstrip('/') + '/' + short_code
    return jsonify({'short_url': short_url, 'short_code': short_code})

@app.route('/delete/<url_id>')
def delete_url(url_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    from bson import ObjectId
    try:
        urls_collection.delete_one({
            "_id": ObjectId(url_id),
            "user_id": session['user_id']
        })
        flash('URL delete successfully')
    except:
        flash('Error deleting URL!')

    return redirect(url_for('home'))

@app.route('/<short_code>')
def redirect_url(short_code):
    url_doc = urls_collection.find_one({"short_code": short_code})

    if not url_doc:
        return render_template('404.html'), 404

    urls_collection.update_one(
        {"short_code": short_code},
        {"$inc": {"click": 1}}
    )

    return redirect(url_doc['original_url'])

if __name__ == '__main__':
    app.run(debug=True)
