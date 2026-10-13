<!DOCTYPE html>
<head>
	<title>jQuery click event</title>
	<script src="https://code.jquery.com/jquery-3.1.0.min.js"></script>
	<script>
	function displayGrade()
	{
		var score=$("#score").val();
		var grade;
		if (score>= 90)
			grade='A';
		else if (score>= 80)
			grade='B';
		else if (score>= 70)
			grade='C';
		else
			grade='F';

		$("#result").html("Your score is "+score+' and your grade is '+grade);
	}

	$(document).ready(function(){
		$("#calculate").click(function(){
			displayGrade();
		});	
		// or
		// $("#calculate").click(displayGrade);
	});	

	</script>
</head>

<body>
<h1>JavaScript click</h1>

Enter your score: <input type="text" id="score" /><br />
<input id="calculate" type="button" value="Enter a score" />
<div id="result"></div>

</body>

</html>
