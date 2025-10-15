# fine_tuning_pipeline.py
"""
Pipeline for fine-tuning the sentence transformer model on domain-specific data.
Supports incremental learning when new job roles are added.
"""

from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from torch.utils.data import DataLoader
from typing import List, Tuple
import pandas as pd
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelFineTuner:
    """Fine-tune sentence transformer for resume-job matching."""
    
    def __init__(self, base_model: str = 'all-MiniLM-L6-v2'):
        """Initialize with base pre-trained model."""
        self.model = SentenceTransformer(base_model)
        self.base_model_name = base_model
        logger.info(f"Initialized fine-tuner with {base_model}")
    
    def prepare_training_data(
        self, 
        training_file: str
    ) -> List[InputExample]:
        """
        Prepare training data from CSV/JSON file.
        
        Expected format (CSV):
        resume_text, job_description, label (0-1 similarity score)
        
        Or JSON:
        [
            {"resume": "...", "job": "...", "label": 0.9},
            ...
        ]
        """
        training_examples = []
        
        if training_file.endswith('.csv'):
            df = pd.read_csv(training_file)
            for _, row in df.iterrows():
                example = InputExample(
                    texts=[row['resume_text'], row['job_description']],
                    label=float(row['label'])
                )
                training_examples.append(example)
        
        elif training_file.endswith('.json'):
            with open(training_file, 'r') as f:
                data = json.load(f)
            
            for item in data:
                example = InputExample(
                    texts=[item['resume'], item['job']],
                    label=float(item['label'])
                )
                training_examples.append(example)
        
        logger.info(f"Loaded {len(training_examples)} training examples")
        return training_examples
    
    def create_synthetic_data(
        self, 
        job_descriptions: List[str],
        sample_resumes: List[str],
        labels: List[float]
    ) -> List[InputExample]:
        """
        Create synthetic training data from job descriptions and resumes.
        Useful for bootstrapping when you don't have labeled data.
        """
        training_examples = []
        
        for resume, job, label in zip(sample_resumes, job_descriptions, labels):
            example = InputExample(texts=[resume, job], label=label)
            training_examples.append(example)
        
        return training_examples
    
    def fine_tune(
        self,
        training_data: List[InputExample],
        output_path: str = './fine_tuned_model',
        epochs: int = 4,
        batch_size: int = 16,
        warmup_steps: int = 100,
        evaluation_data: List[InputExample] = None
    ):
        """
        Fine-tune the model on training data.
        
        Args:
            training_data: List of InputExample objects
            output_path: Where to save fine-tuned model
            epochs: Number of training epochs
            batch_size: Batch size for training
            warmup_steps: Warmup steps for learning rate
            evaluation_data: Optional validation data
        """
        # Create DataLoader
        train_dataloader = DataLoader(
            training_data, 
            shuffle=True, 
            batch_size=batch_size
        )
        
        # Use CosineSimilarityLoss for regression-style similarity
        train_loss = losses.CosineSimilarityLoss(self.model)
        
        # Optional evaluator
        evaluator = None
        if evaluation_data:
            sentences1 = [ex.texts[0] for ex in evaluation_data]
            sentences2 = [ex.texts[1] for ex in evaluation_data]
            scores = [ex.label for ex in evaluation_data]
            
            evaluator = EmbeddingSimilarityEvaluator(
                sentences1, 
                sentences2, 
                scores
            )
        
        # Train
        logger.info("Starting fine-tuning...")
        self.model.fit(
            train_objectives=[(train_dataloader, train_loss)],
            epochs=epochs,
            warmup_steps=warmup_steps,
            evaluator=evaluator,
            evaluation_steps=500,
            output_path=output_path,
            show_progress_bar=True
        )
        
        logger.info(f"Model saved to {output_path}")
    
    def incremental_update(
        self,
        new_training_data: List[InputExample],
        existing_model_path: str,
        output_path: str,
        epochs: int = 2
    ):
        """
        Incrementally update an existing fine-tuned model with new data.
        Useful when new job roles are added.
        """
        # Load existing fine-tuned model
        self.model = SentenceTransformer(existing_model_path)
        logger.info(f"Loaded existing model from {existing_model_path}")
        
        # Continue training
        self.fine_tune(
            new_training_data,
            output_path,
            epochs=epochs,
            batch_size=8  # Smaller batch for incremental updates
        )
    
    def evaluate_model(
        self, 
        test_data: List[InputExample]
    ) -> dict:
        """
        Evaluate model performance on test data.
        """
        sentences1 = [ex.texts[0] for ex in test_data]
        sentences2 = [ex.texts[1] for ex in test_data]
        true_scores = [ex.label for ex in test_data]
        
        evaluator = EmbeddingSimilarityEvaluator(
            sentences1, 
            sentences2, 
            true_scores
        )
        
        score = evaluator(self.model)
        logger.info(f"Evaluation score: {score}")
        
        return {"spearman_correlation": score}


def generate_sample_training_data() -> List[InputExample]:
    """
    Generate sample training data for demonstration.
    In production, collect real labeled data from HR feedback.
    """
    samples = [
        # High match examples
        InputExample(
            texts=[
                "Senior Python Developer with 5 years experience in Django, PostgreSQL, AWS",
                "Looking for Senior Python Developer. Must have Django, PostgreSQL, cloud experience."
            ],
            label=0.95
        ),
        InputExample(
            texts=[
                "Machine Learning Engineer, expert in TensorFlow, PyTorch, NLP",
                "Seeking ML Engineer with deep learning and NLP background"
            ],
            label=0.90
        ),
        
        # Medium match examples
        InputExample(
            texts=[
                "Junior Java developer with Spring Boot knowledge",
                "Senior Python Developer needed with Django experience"
            ],
            label=0.40
        ),
        
        # Low match examples
        InputExample(
            texts=[
                "Graphic Designer with Photoshop and Illustrator skills",
                "Backend Developer needed with Python and SQL"
            ],
            label=0.10
        ),
        InputExample(
            texts=[
                "Fresh graduate with basic HTML CSS knowledge",
                "Senior Full Stack Developer with 5+ years React, Node.js"
            ],
            label=0.15
        )
    ]
    
    return samples


# Example usage
if __name__ == "__main__":
    # Initialize fine-tuner
    tuner = ModelFineTuner()
    
    # Generate sample data (replace with real data)
    training_data = generate_sample_training_data()
    
    # Split into train/test
    split_idx = int(len(training_data) * 0.8)
    train_data = training_data[:split_idx]
    test_data = training_data[split_idx:]
    
    # Fine-tune model
    tuner.fine_tune(
        train_data,
        output_path='./models/fine_tuned_resume_matcher',
        epochs=3,
        evaluation_data=test_data
    )
    
    # Evaluate
    results = tuner.evaluate_model(test_data)
    print(f"Evaluation results: {results}")
    
    # Example: Incremental update when new job role data arrives
    new_data = [
        InputExample(
            texts=[
                "DevOps Engineer with Kubernetes, Docker, Jenkins",
                "Need DevOps expert for CI/CD pipeline setup"
            ],
            label=0.92
        )
    ]
    
    tuner.incremental_update(
        new_data,
        existing_model_path='./models/fine_tuned_resume_matcher',
        output_path='./models/fine_tuned_resume_matcher_v2',
        epochs=1
    )