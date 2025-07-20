from flask import Flask, request
from flask_cors import CORS


import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='Cark2005',
        database='realest_reviews'
    )

app = Flask(__name__)
CORS(app)

@app.route('/api/hello')
def hello():
    return {'message': 'Hello from the backend!'}

@app.route('/api/media')
def get_media():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, title, type, creator, release_date, image_url FROM media;")
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return {'media': result}


@app.route('/api/reviews', methods=['POST'])
def add_review():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

 
    cursor.execute(
        "INSERT INTO reviews (media_id, username, overall_score, keywords, review_text) VALUES (%s, %s, %s, %s, %s)",
        (data['media_id'], data['username'], data['overall_score'], data['keywords'], data['review_text'])
    )
    review_id = cursor.lastrowid


    for category_score in data['categories']:
        cursor.execute(
            "INSERT INTO review_categories (review_id, category, score) VALUES (%s, %s, %s)",
            (review_id, category_score['category'], category_score['score'])
        )

    conn.commit()
    cursor.close()
    conn.close()

    return {'status': 'success', 'review_id': review_id}

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    media_id = request.args.get('media_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM reviews WHERE media_id = %s",
        (media_id,)
    )
    reviews = cursor.fetchall()

    # Get categories for each review
    for review in reviews:
        cursor.execute(
            "SELECT category, score FROM review_categories WHERE review_id = %s",
            (review['id'],)
        )
        review['categories'] = cursor.fetchall()
    cursor.close()
    conn.close()
    return {'reviews': reviews}

@app.route('/api/review_votes', methods=['POST'])
def add_vote():
    data = request.json
    review_id = data['review_id']
    vote_type = data['vote_type']  # 'helpful', 'funny', or 'unhelpful'
    voter = data.get('voter', 'anonymous')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if user already voted on this review
    cursor.execute(
        "SELECT COUNT(*) FROM review_votes WHERE review_id = %s AND voter = %s",
        (review_id, voter)
    )
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO review_votes (review_id, vote_type, voter) VALUES (%s, %s, %s)",
            (review_id, vote_type, voter)
        )
        conn.commit()
        status = 'success'
    else:
        status = 'already_voted'

    cursor.close()
    conn.close()
    return {'status': status}

@app.route('/api/review_votes/<int:review_id>', methods=['GET'])
def get_votes(review_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT vote_type, COUNT(*) as count FROM review_votes WHERE review_id = %s GROUP BY vote_type",
        (review_id,)
    )
    votes = {row['vote_type']: row['count'] for row in cursor.fetchall()}
    cursor.close()
    conn.close()
    return votes

@app.route('/api/reviews', methods=['GET'])
def add_reviews():
    media_id = request.args.get('media_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM reviews WHERE media_id = %s",
        (media_id,)
    )
    reviews = cursor.fetchall()

    # Get categories and helpful votes for each review
    for review in reviews:
        cursor.execute(
            "SELECT category, score FROM review_categories WHERE review_id = %s",
            (review['id'],)
        )
        review['categories'] = cursor.fetchall()
        
        # Get helpful votes
        cursor.execute(
            "SELECT COUNT(*) as helpful FROM review_votes WHERE review_id = %s AND vote_type = 'helpful'",
            (review['id'],)
        )
        review['helpful_votes'] = cursor.fetchone()['helpful']

    cursor.close()
    conn.close()
    # Sort reviews by helpful votes (descending)
    reviews.sort(key=lambda r: r['helpful_votes'], reverse=True)
    return {'reviews': reviews}

if __name__ == '__main__':
    app.run(debug=True)