import org.tap4j.consumer.TapConsumerFactory;
import org.tap4j.consumer.TapConsumer;
import org.tap4j.model.TestSet;
import org.tap4j.model.TestResult;
import org.tap4j.parser.Tap13YamlParser;
import java.lang.reflect.Method;
import org.tap4j.model.Comment;
import org.tap4j.model.TapResult;
import java.util.List;
import java.util.Map;
import java.io.*;

public class Test{

    public static void printMap(Map<String, Object> map, String indent){
        for (Map.Entry<String, Object> entry : map.entrySet()){
            Object value = entry.getValue();
            System.out.print(indent + entry.getKey() + ": ");
            if (value instanceof Map){
                System.out.print("(M)");
                System.out.println();
                printMap((Map<String, Object>) value, indent + "  ");
                System.out.println();
            }else{
                System.out.print("(V)");
                System.out.println(value);
            }
        }
    }

    public static void main(String[] argv) throws Exception{
        if (argv.length == 0){
            System.err.println("Please supply a file name as argument.");
            System.exit(1);
        }
        String filename = argv[0];
        BufferedReader input = new BufferedReader(new FileReader(filename));
        StringBuilder contents = new StringBuilder();
        String line;
        while (null != (line = input.readLine())){
            contents.append(line);
            contents.append("\n");
        }

        String tapText = contents.toString();

        TapConsumer consumer = TapConsumerFactory.makeTap13YamlConsumer();
        TestSet tests = consumer.load(tapText);

        for (int i = 0; i < tests.getNumberOfTestResults(); i++){
            TestResult test = tests.getTestResult(i + 1);
            System.out.print("Test " + test.getTestNumber() + " ");
            System.out.print(test.getDescription() + " ");
            System.out.println(test.getStatus());

            Map<String, Object> diagnostic = test.getDiagnostic();

            printMap(diagnostic, "  ");
        }

        /*
        Class c = TestResult.class;
        for (Method method : c.getDeclaredMethods()) {
          //if (method.getAnnotation(PostConstruct.class) != null) {
            System.out.println(method.getName());
          //}
        }
        */

        

        System.out.print(tests.getNumberOfTestResults() + " tests total. ");
        if (tests.containsNotOk()){
            System.out.println("Some tests failed :(");
        }else{
            System.out.println("ALL PASSED :D");
        }

    }

}