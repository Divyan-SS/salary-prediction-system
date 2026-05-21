# Salary Prediction System

Full-stack application predicting developer salaries using a Decision Tree Regressor trained on Stack Overflow Developer Survey 2020.

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload